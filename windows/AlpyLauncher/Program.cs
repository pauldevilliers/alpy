using System.Text.Json;

namespace Alpy;

internal static class Program
{
    public static readonly string ConfigDirectory =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Alpy");

    public static readonly string ConfigPath = Path.Combine(ConfigDirectory, "config.json");

    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        Directory.CreateDirectory(ConfigDirectory);

        var config = LoadConfig();

        if (config is null || string.IsNullOrWhiteSpace(config.Url))
        {
            using var setup = new SetupForm();
            if (setup.ShowDialog() != DialogResult.OK)
                return;

            config = new AlpyConfig { Url = setup.AlpyUrl };
            SaveConfig(config);
        }

        Application.Run(new MainForm(config));
    }

    public static AlpyConfig? LoadConfig()
    {
        try
        {
            if (!File.Exists(ConfigPath)) return null;
            return JsonSerializer.Deserialize<AlpyConfig>(File.ReadAllText(ConfigPath));
        }
        catch
        {
            return null;
        }
    }

    public static void SaveConfig(AlpyConfig config)
    {
        Directory.CreateDirectory(ConfigDirectory);
        File.WriteAllText(ConfigPath,
            JsonSerializer.Serialize(config, new JsonSerializerOptions { WriteIndented = true }));
    }
}

public sealed class AlpyConfig
{
    public string Url { get; set; } = "";
}
