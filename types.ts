export enum IndexingStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  INDEXED = 'INDEXED',
  FAILED = 'FAILED',
}

export interface Page {
  id: string;
  url: string;
  status: IndexingStatus;
  lastSubmitted: string | null;
}
