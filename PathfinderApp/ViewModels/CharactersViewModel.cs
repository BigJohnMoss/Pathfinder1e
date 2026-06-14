using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Input;
using PathfinderApp.Models;
using PathfinderApp.Data;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.IO;

namespace PathfinderApp.ViewModels;

public class CharactersViewModel : INotifyPropertyChanged
{
    public ObservableCollection<Character> Characters { get; } = new();

    Character? selectedCharacter;
    public Character? SelectedCharacter
    {
        get => selectedCharacter;
        set
        {
            if (selectedCharacter == value)
                return;
            selectedCharacter = value;
            OnPropertyChanged();
            if (selectedCharacter is not null)
                OpenDetail(selectedCharacter);
        }
    }

    public ICommand AddCommand { get; }

    readonly CharacterRepository repo;

    public CharactersViewModel(CharacterRepository repository)
    {
        repo = repository;
        AddCommand = new Command(async () => await AddAsync());
    }

    public async Task LoadAsync()
    {
        Characters.Clear();
        var list = await repo.GetAllAsync();
        foreach (var c in list)
            Characters.Add(c);
    }

    async Task AddAsync()
    {
        var c = new Character { Name = "New PC", Level = 1 };
        await repo.SaveAsync(c);
        Characters.Add(c);
        SelectedCharacter = c;
    }

    async void OpenDetail(Character c)
    {
        await Shell.Current.Navigation.PushAsync(new Pages.CharacterDetailPage(repo) { BindingContext = c });
        // clear selection so the item can be selected again later
        SelectedCharacter = null;
    }

    public event PropertyChangedEventHandler? PropertyChanged;
    void OnPropertyChanged([CallerMemberName] string? name = null) => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
