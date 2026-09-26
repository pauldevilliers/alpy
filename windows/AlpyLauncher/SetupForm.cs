namespace Alpy;

public sealed class SetupForm : Form
{
    private readonly TextBox _url = new()
    {
        Dock = DockStyle.Top,
        PlaceholderText = "https://alpy.example.com",
        Font = new Font("Segoe UI", 12F),
        Margin = new Padding(0, 8, 0, 16)
    };

    public string AlpyUrl => Normalize(_url.Text);

    public SetupForm()
    {
        Text = "Welcome to Alpy";
        Width = 520;
        Height = 270;
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = Color.FromArgb(17, 17, 17);
        ForeColor = Color.White;
        Padding = new Padding(28);

        var title = new Label
        {
            Text = "Alpy",
            Dock = DockStyle.Top,
            Height = 58,
            Font = new Font("Segoe UI", 28F, FontStyle.Bold),
            ForeColor = Color.White
        };

        var copy = new Label
        {
            Text = "Enter the address of your Alpy cloud workspace.\nYou only need to do this once.",
            Dock = DockStyle.Top,
            Height = 54,
            Font = new Font("Segoe UI", 10F),
            ForeColor = Color.Gainsboro
        };

        var connect = new Button
        {
            Text = "Connect to Alpy",
            Dock = DockStyle.Bottom,
            Height = 42,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 10F, FontStyle.Bold)
        };
        connect.FlatAppearance.BorderColor = Color.DimGray;
        connect.Click += (_, _) => Connect();

        Controls.Add(connect);
        Controls.Add(_url);
        Controls.Add(copy);
        Controls.Add(title);

        AcceptButton = connect;
    }

    private void Connect()
    {
        var normalized = Normalize(_url.Text);
        if (!Uri.TryCreate(normalized, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
        {
            MessageBox.Show("Enter a valid http:// or https:// Alpy address.",
                "Alpy", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }

        _url.Text = normalized;
        DialogResult = DialogResult.OK;
        Close();
    }

    private static string Normalize(string value)
    {
        var v = value.Trim().TrimEnd('/');
        if (v.Length > 0 && !v.Contains("://"))
            v = "https://" + v;
        return v;
    }
}
