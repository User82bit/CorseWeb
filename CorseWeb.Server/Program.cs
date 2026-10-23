using System.Text.Json;
using System.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using CorseWeb.Server.Data;
using CorseWeb.Server.Models;

var builder = WebApplication.CreateBuilder(args);

// Local-only settings are loaded in Development, while environment variables
// and command-line arguments retain their normal higher priority.
if (builder.Environment.IsDevelopment())
{
    var localSettings = new Microsoft.Extensions.Configuration.Json.JsonConfigurationSource
    {
        Path = "appsettings.Development.local.json",
        Optional = true,
        ReloadOnChange = true
    };
    localSettings.ResolveFileProvider(builder.Environment.ContentRootFileProvider);

    var environmentVariablesIndex = -1;
    for (var index = 0; index < builder.Configuration.Sources.Count; index++)
    {
        if (string.Equals(
                builder.Configuration.Sources[index].GetType().Name,
                "EnvironmentVariablesConfigurationSource",
                StringComparison.Ordinal))
        {
            environmentVariablesIndex = index;
            break;
        }
    }

    if (environmentVariablesIndex < 0)
        builder.Configuration.Sources.Add(localSettings);
    else
        builder.Configuration.Sources.Insert(environmentVariablesIndex, localSettings);
}

// DbContext — SQLite em dev (migra para Postgres com troca de provider/connection string)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=corseweb.db";
builder.Services.AddDbContext<AppDbContext>(opts => opts.UseSqlite(connectionString));

// Auth — cookie de sessão com validação do Google ID token no AuthController.
// ClientSecret não é usado pelo fluxo atual de Google Identity Services.
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(opts =>
    {
        opts.Cookie.Name = "corseweb.auth";
        opts.Cookie.HttpOnly = true;
        opts.Cookie.SameSite = SameSiteMode.Lax;
        opts.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest; // SameAsRequest para não quebrar em http dev
        opts.ExpireTimeSpan = TimeSpan.FromDays(14);
        opts.SlidingExpiration = true;
        opts.LoginPath = "/api/auth/me";
        opts.Events.OnRedirectToLogin = ctx =>
        {
            // API retorna 401 em JSON ao invés de redirect
            if (ctx.Request.Path.StartsWithSegments("/api"))
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsync(JsonSerializer.Serialize(new { authenticated = false }));
            }
            ctx.Response.Redirect(ctx.RedirectUri);
            return Task.CompletedTask;
        };
        opts.Events.OnRedirectToAccessDenied = ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/api"))
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                ctx.Response.ContentType = "application/json";
                return ctx.Response.WriteAsync(JsonSerializer.Serialize(new { error = "forbidden" }));
            }
            ctx.Response.Redirect(ctx.RedirectUri);
            return Task.CompletedTask;
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();

// Permite Vite em https://localhost:49188 enviar cookies (quando rodar separado do SpaProxy)
builder.Services.AddCors(opts =>
{
    opts.AddPolicy("dev", p => p
        .WithOrigins("https://localhost:49188", "http://localhost:49188", "https://localhost:7028", "http://localhost:5108")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddOpenApi();

var app = builder.Build();

// Migrate em startup (cria corseweb.db se não existir)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        if (db.Database.GetPendingMigrations().Any())
            db.Database.Migrate();
        else
            db.Database.EnsureCreated();

        // Compatibility migration: existing SQLite databases were created with
        // EnsureCreated and do not receive new columns automatically.
        EnsurePasswordHashColumn(db);
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Erro ao migrar/criar banco");
        try
        {
            db.Database.EnsureCreated();
            EnsurePasswordHashColumn(db);
        }
        catch (Exception fallbackException)
        {
            logger.LogError(fallbackException, "Erro ao garantir o esquema compatível do banco");
        }
    }
}

app.UseDefaultFiles();

// Inicializa a pasta antes de criar o provedor: ela pode não existir em uma
// instalação nova, mas as capas enviadas precisam ficar acessíveis imediatamente.
var webRoot = app.Environment.WebRootPath;
if (string.IsNullOrWhiteSpace(webRoot))
    webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "course-covers"));
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(webRoot)
});
app.MapStaticAssets();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseCors("dev");
}

// Em dev o SpaProxy cuida do Vite; em prod o fallback serve o SPA
// HttpsRedirection pode quebrar dev sem cert — mantém mas não força em Development se sem https
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();


static void EnsurePasswordHashColumn(AppDbContext db)
{
    if (!db.Database.IsSqlite()) return;

    var connection = db.Database.GetDbConnection();
    var closeConnection = connection.State != ConnectionState.Open;
    if (closeConnection) connection.Open();

    try
    {
        var hasPasswordHash = false;
        using (var command = connection.CreateCommand())
        {
            command.CommandText = "PRAGMA table_info('Users');";
            using var reader = command.ExecuteReader();
            while (reader.Read())
            {
                if (string.Equals(reader.GetString(1), "PasswordHash", StringComparison.OrdinalIgnoreCase))
                {
                    hasPasswordHash = true;
                    break;
                }
            }
        }

        if (!hasPasswordHash)
        {
            using var command = connection.CreateCommand();
            command.CommandText = "ALTER TABLE \"Users\" ADD COLUMN \"PasswordHash\" TEXT NULL;";
            command.ExecuteNonQuery();
        }
    }
    finally
    {
        if (closeConnection) connection.Close();
    }
}
