using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Alpy;

public sealed class MainForm : Form
{
    private readonly WebView2 _web = new() { Dock = DockStyle.Fill };
    private AlpyConfig _config;

    public MainForm(AlpyConfig config)
    {
        _config = config;
        Text = "Alpy";
        Width = 1400;
        Height = 900;
        MinimumSize = new Size(760, 520);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.Black;
        KeyPreview = true;

        Controls.Add(_web);

        Load += async (_, _) => await StartAsync();
        KeyDown += OnKeyDown;
    }

    private async Task StartAsync()
    {
        try
        {
            var webData = Path.Combine(Program.ConfigDirectory, "WebView2");
            var env = await CoreWebView2Environment.CreateAsync(null, webData);
            await _web.EnsureCoreWebView2Async(env);

            _web.CoreWebView2.Settings.AreDevToolsEnabled = false;
            _web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            _web.CoreWebView2.Settings.IsStatusBarEnabled = false;
            _web.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = true;

            _web.CoreWebView2.NewWindowRequested += (_, e) =>
            {
                e.Handled = true;
                _web.CoreWebView2.Navigate(e.Uri);
            };

            _web.Source = new Uri(_config.Url);
        }
        catch (WebView2RuntimeNotFoundException)
        {
            MessageBox.Show(
                "Alpy needs the Microsoft Edge WebView2 Runtime.\n\n" +
                "Install it from Microsoft, then open Alpy again.",
                "Alpy", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
        catch (Exception ex)
        {
            MessageBox.Show("Alpy could not start:\n\n" + ex.Message,
                "Alpy", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void OnKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Control && e.KeyCode == Keys.R)
        {
            _web.CoreWebView2?.Reload();
            e.SuppressKeyPress = true;
        }
        else if (e.Control && e.Oemcomma)
        {
            ChangeServer();
            e.SuppressKeyPress = true;
        }
        else if (e.KeyCode == Keys.F11)
        {
            FormBorderStyle = FormBorderStyle == FormBorderStyle.None
                ? FormBorderStyle.Sizable
                : FormBorderStyle.None;
            WindowState = FormWindowState.Maximized;
            e.SuppressKeyPress = true;
        }
    }

    private void ChangeServer()
    {
        using var setup = new SetupForm();
        if (setup.ShowDialog(this) != DialogResult.OK)
            return;

        _config = new AlpyConfig { Url = setup.AlpyUrl };
        Program.SaveConfig(_config);
        _web.Source = new Uri(_config.Url);
    }
}
