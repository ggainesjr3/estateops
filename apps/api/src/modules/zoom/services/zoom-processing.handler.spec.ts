jest.mock('typeorm', () => ({ Repository: class Repository {} }));
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined }));
jest.mock('../../users/entities/user.entity', () => ({ User: class User {} }));
jest.mock('../../ai/ai.service', () => ({ AiService: class AiService {} }));
jest.mock('../../storage/storage.service', () => ({ StorageService: class StorageService {} }));
jest.mock('../../notifications/services/notification.service', () => ({
  NotificationService: class NotificationService {},
}));
jest.mock('./zoom-api.service', () => ({ ZoomApiService: class ZoomApiService {} }));
jest.mock('../repositories/meeting-archive.repository', () => ({
  MeetingArchiveRepository: class MeetingArchiveRepository {},
}));

import { Readable } from 'stream';
import { MeetingArchiveStatus } from '@estateops/shared';
import { ZoomProcessingHandler } from './zoom-processing.handler';

describe('ZoomProcessingHandler pipeline steps', () => {
  const archives = {
    findByIdOrFail: jest.fn(),
    updateStatus: jest.fn(),
    update: jest.fn(),
  };
  const zoomApi = {
    downloadAsStream: jest.fn(),
    downloadAsText: jest.fn(),
  };
  const storage = {
    uploadStream: jest.fn(),
    uploadFile: jest.fn(),
  };
  const ai = { summarizeTranscript: jest.fn() };
  const notifications = { send: jest.fn() };
  const userRepo = { findOne: jest.fn() };

  let handler: ZoomProcessingHandler;

  const baseArchive = {
    id: 'arch-1',
    orgId: 'org-1',
    zoomMeetingId: '12345',
    zoomUuid: 'uuid-1',
    topic: 'Weekly standup',
    hostUserId: 'user-1',
    startedAt: new Date('2024-06-15T10:00:00Z'),
    createdAt: new Date('2024-06-15T10:00:00Z'),
    recordingFiles: [
      {
        file_type: 'MP4',
        download_url: 'https://zoom.us/recording.mp4',
        file_size: 1024,
      },
      {
        file_type: 'TRANSCRIPT',
        download_url: 'https://zoom.us/transcript.vtt',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new ZoomProcessingHandler(
      archives as never,
      zoomApi as never,
      storage as never,
      ai as never,
      notifications as never,
      userRepo as never,
    );

    archives.findByIdOrFail.mockResolvedValue(baseArchive);
    archives.updateStatus.mockImplementation(async (_id, status, patch) => ({
      ...baseArchive,
      status,
      ...patch,
    }));
    archives.update.mockImplementation(async (_id, patch) => ({
      ...baseArchive,
      ...patch,
    }));

    zoomApi.downloadAsStream.mockResolvedValue({
      stream: Readable.from([Buffer.from([1, 2, 3])]),
      contentLength: 1024,
      mimeType: 'video/mp4',
    });
    zoomApi.downloadAsText.mockResolvedValue(
      'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nAction item: fix leak',
    );
    storage.uploadStream.mockResolvedValue({
      id: 'rec-item',
      webUrl: 'https://sp/rec',
      downloadUrl: 'https://sp/rec/dl',
      size: 1024,
    });
    storage.uploadFile.mockResolvedValue({
      id: 'vtt-item',
      webUrl: 'https://sp/vtt',
      downloadUrl: 'https://sp/vtt/dl',
      size: 100,
    });
    ai.summarizeTranscript.mockResolvedValue({
      summary: 'Discussed maintenance',
      action_items: [{ assignee: 'Pat', task: 'Fix leak' }],
      key_decisions: [],
      topics_discussed: ['maintenance'],
    });
    notifications.send.mockResolvedValue({});
  });

  it('runs full pipeline through summarized', async () => {
    await handler.process('org-1', 'arch-1');

    expect(archives.updateStatus).toHaveBeenCalledWith(
      'arch-1',
      MeetingArchiveStatus.PROCESSING,
    );
    expect(zoomApi.downloadAsStream).toHaveBeenCalled();
    expect(storage.uploadStream).toHaveBeenCalled();
    expect(zoomApi.downloadAsText).toHaveBeenCalled();
    expect(ai.summarizeTranscript).toHaveBeenCalledWith(
      'org-1',
      expect.stringContaining('Action item'),
    );
    expect(archives.update).toHaveBeenCalledWith(
      'arch-1',
      expect.objectContaining({ status: MeetingArchiveStatus.SUMMARIZED }),
    );
    expect(notifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        body: expect.stringContaining('Weekly standup'),
      }),
    );
  });

  it('marks failed on upload error', async () => {
    storage.uploadStream.mockRejectedValue(new Error('SharePoint down'));

    await expect(handler.process('org-1', 'arch-1')).rejects.toThrow('SharePoint down');

    expect(archives.updateStatus).toHaveBeenCalledWith(
      'arch-1',
      MeetingArchiveStatus.FAILED,
      expect.objectContaining({ failureReason: 'SharePoint down' }),
    );
  });

  it('step 1: streams recording to SharePoint folder', async () => {
    await handler.process('org-1', 'arch-1');

    expect(zoomApi.downloadAsStream).toHaveBeenCalledWith('https://zoom.us/recording.mp4');
    expect(storage.uploadStream).toHaveBeenCalledWith(
      'org-1',
      'org-1/Meetings/2024/06/12345',
      expect.stringMatching(/^recording\./),
      'video/mp4',
      1024,
      expect.anything(),
    );
  });

  it('step 2: downloads VTT and uploads transcript file', async () => {
    await handler.process('org-1', 'arch-1');

    expect(zoomApi.downloadAsText).toHaveBeenCalledWith('https://zoom.us/transcript.vtt');
    expect(storage.uploadFile).toHaveBeenCalledWith(
      'org-1',
      'org-1/Meetings/2024/06/12345',
      'transcript.vtt',
      expect.any(Buffer),
      'text/vtt',
    );
  });

  it('step 4: summarizes parsed transcript text', async () => {
    await handler.process('org-1', 'arch-1');

    expect(ai.summarizeTranscript).toHaveBeenCalledWith(
      'org-1',
      expect.stringMatching(/Action item: fix leak/),
    );
  });

  it('step 5: sets uploaded then summarized status', async () => {
    await handler.process('org-1', 'arch-1');

    expect(archives.update).toHaveBeenCalledWith(
      'arch-1',
      expect.objectContaining({ status: MeetingArchiveStatus.UPLOADED }),
    );
    expect(archives.update).toHaveBeenCalledWith(
      'arch-1',
      expect.objectContaining({ status: MeetingArchiveStatus.SUMMARIZED }),
    );
  });
});
