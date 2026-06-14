using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using SQLite;
using PathfinderApp.Models;

namespace PathfinderApp.Data;

public class CharacterRepository
{
    readonly SQLiteAsyncConnection db;

    public CharacterRepository(string dbPath)
    {
        db = new SQLiteAsyncConnection(dbPath);
        // Ensure table exists synchronously to avoid async deadlocks on startup.
        db.CreateTableAsync<Character>().GetAwaiter().GetResult();
    }

    public Task<List<Character>> GetAllAsync() => db.Table<Character>().ToListAsync();

    public Task<Character?> GetAsync(string id) => db.Table<Character>().Where(c => c.Id == id).FirstOrDefaultAsync();

    public Task<int> SaveAsync(Character character)
    {
        if (string.IsNullOrEmpty(character.Id))
            character.Id = System.Guid.NewGuid().ToString();
        return db.InsertOrReplaceAsync(character);
    }

    public Task<int> DeleteAsync(Character character) => db.DeleteAsync(character);
}
