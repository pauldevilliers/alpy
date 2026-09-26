using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace AlpyWeb;

public sealed class MainForm : Form
{
    private readonly WebView2 _web = new() { Dock = DockStyle.Fill };
    private bool _fullscreen;

    public MainForm()
    {
        Text = "Alpy Web";
        Width = 1400;
        Height = 900;
        MinimumSize = new Size(800, 520);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.Black;
        KeyPreview = true;

        Controls.Add(_web);

        Load += async (_, _) => await StartAsync();
        KeyDown += HandleKeys;
    }

    private async Task StartAsync()
    {
        try
        {
            var dataDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "AlpyWeb",
                "WebView2");

            Directory.CreateDirectory(dataDir);

            var environment = await CoreWebView2Environment.CreateAsync(null, dataDir);
            await _web.EnsureCoreWebView2Async(environment);

            var webRoot = Path.Combine(AppContext.BaseDirectory, "web");

            if (!Directory.Exists(webRoot))
            {
                MessageBox.Show(
                    "The bundled Alpy Web files could not be found.",
                    "Alpy Web",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                Close();
                return;
            }

            _web.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "alpy.local",
                webRoot,
                CoreWebView2HostResourceAccessKind.Allow);

            _web.CoreWebView2.Settings.AreDevToolsEnabled = true;
            _web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            _web.CoreWebView2.Settings.IsStatusBarEnabled = false;
            _web.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = true;
            _web.CoreWebView2.Settings.IsZoomControlEnabled = true;

            _web.CoreWebView2.NewWindowRequested += (_, e) =>
            {
                e.Handled = true;
                _web.CoreWebView2.Navigate(e.Uri);
            };

            _web.CoreWebView2.Navigate("https://alpy.local/index.html");
        }
        catch (WebView2RuntimeNotFoundException)
        {
            MessageBox.Show(
                "Alpy Web needs the Microsoft Edge WebView2 Runtime.\n\n" +
                "Install WebView2 Runtime and start Alpy Web again.",
                "Alpy Web",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                "Alpy Web could not start:\n\n" + ex.Message,
                "Alpy Web",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }

    private void HandleKeys(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode == Keys.F11)
        {
            ToggleFullscreen();
            e.SuppressKeyPress = true;
        }
        else if (e.Control && e.KeyCode == Keys.R)
        {
            _web.CoreWebView2?.Reload();
            e.SuppressKeyPress = true;
        }
        else if (e.Control && e.Shift && e.KeyCode == Keys.I)
        {
            _web.CoreWebView2?.OpenDevToolsWindow();
            e.SuppressKeyPress = true;
        }
    }

    private void ToggleFullscreen()
    {
        _fullscreen = !_fullscreen;

        if (_fullscreen)
        {
            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Maximized;
        }
        else
        {
            FormBorderStyle = FormBorderStyle.Sizable;
            WindowState = FormWindowState.Normal;
        }
    }
}
