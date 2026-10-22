using System.Text.Json;
using System.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using CorseWeb.Server.Data;
using CorseWeb.Server.Models;

var builder = WebApplication.CreateBuilder(args);

// DbContext — SQLite em dev (migra para Postgres com troca de provider/connection string)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=corseweb.db";
builder.Services.AddDbContext<AppDbContext>(opts => opts.UseSqlite(connectionString));

// Auth — Cookie com validação via Google id_token no AuthController (Google.Apis.Auth)
// Opcional: AddGoogle para fluxo server-side quando ClientId/Secret configurados
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
// Também serve arquivos enviados durante a execução (ex.: capas de cursos).
app.UseStaticFiles();
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
