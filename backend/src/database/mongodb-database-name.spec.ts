import { mongodbDatabaseName } from './database.module';

describe('mongodbDatabaseName', () => {
  it('reads only the database name from a URI', () => {
    expect(
      mongodbDatabaseName('mongodb://localhost:27017/credex_backend'),
    ).toBe('credex_backend');
    expect(
      mongodbDatabaseName('mongodb+srv://user:secret@cluster.example.net/test?retryWrites=true'),
    ).toBe('test');
    expect(mongodbDatabaseName('mongodb://localhost:27017')).toBe('(default)');
  });
});
