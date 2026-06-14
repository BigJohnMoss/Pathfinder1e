using PathfinderApp.Models;
using PathfinderApp.Data;
using System;
using CommunityToolkit.Maui.Alerts;
using CommunityToolkit.Maui.Core;

namespace PathfinderApp.Pages;

public partial class CharacterDetailPage : ContentPage
{
    readonly CharacterRepository repo;

    public CharacterDetailPage(CharacterRepository repository)
    {
        InitializeComponent();
        repo = repository;
    }

    async void OnSaveClicked(object? sender, EventArgs e)
    {
        if (BindingContext is Character c)
        {
            await repo.SaveAsync(c);
            await Shell.Current.Navigation.PopAsync();
        }
    }

    async void OnDeleteClicked(object? sender, EventArgs e)
    {
        if (BindingContext is Character c)
        {
            var confirm = await DisplayAlert("Delete", $"Delete '{c.Name}'?", "Delete", "Cancel");
            if (!confirm)
                return;

            await repo.DeleteAsync(c);

            // non-blocking undo via Snackbar
            var snackbar = Snackbar.Make("Character deleted", () => { _ = repo.SaveAsync(c); }, "Undo", TimeSpan.FromSeconds(4));
            await snackbar.Show();

            await Shell.Current.Navigation.PopAsync();
        }
    }
}
