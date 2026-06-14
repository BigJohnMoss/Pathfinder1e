using PathfinderApp.ViewModels;
using PathfinderApp.Data;
using System.IO;


namespace PathfinderApp.Pages;

public partial class CharactersPage : ContentPage
{
    CharactersViewModel vm;

    public CharactersPage()
    {
        InitializeComponent();
        var dbPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "pathfinder.db3");
        var repo = new CharacterRepository(dbPath);
        vm = new CharactersViewModel(repo);
        BindingContext = vm;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        await vm.LoadAsync();
    }
}
