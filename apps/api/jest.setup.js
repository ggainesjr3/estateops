require('reflect-metadata');

jest.mock('bullmq', () => ({
  Queue: class Queue {},
  Worker: class Worker {},
  Job: class Job {},
}));

jest.mock('prom-client', () => ({
  Registry: class Registry {
    metrics() {
      return '';
    }
  },
  Counter: class Counter {
    inc() {}
  },
  Gauge: class Gauge {
    set() {}
  },
  Histogram: class Histogram {
    observe() {}
  },
  collectDefaultMetrics: () => {},
}));

jest.mock('@nestjs/bullmq', () => ({
  BullModule: {
    forRoot: () => ({ module: class BullRootModule {} }),
    forRootAsync: () => ({ module: class BullRootAsyncModule {} }),
    registerQueue: () => ({ module: class BullQueueModule {} }),
  },
  Processor: () => () => undefined,
  WorkerHost: class WorkerHost {},
  OnWorkerEvent: () => () => undefined,
  InjectQueue: () => () => undefined,
}));
