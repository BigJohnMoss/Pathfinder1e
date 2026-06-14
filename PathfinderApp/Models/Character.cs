using SQLite;

namespace PathfinderApp.Models;

[Table("Characters")]
public class Character
{
    [PrimaryKey]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "New Character";
    public int Level { get; set; } = 1;
    public string Summary { get; set; } = string.Empty;
}
