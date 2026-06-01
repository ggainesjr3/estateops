import { parseVttToPlainText } from './vtt-parser.util';

describe('parseVttToPlainText', () => {
  it('strips cues and timing lines', () => {
    const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Hello <b>team</b>

2
00:00:05.000 --> 00:00:07.000
We approved the budget`;
    expect(parseVttToPlainText(vtt)).toBe('Hello team\nWe approved the budget');
  });
});
