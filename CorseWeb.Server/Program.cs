using System.Text.Json;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using CorseWeb.Server.Data;

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
    // Use Migrate para aplicar migrations; se não houver migrations ainda, EnsureCreated como fallback
    try
    {
        if (db.Database.GetPendingMigrations().Any())
            db.Database.Migrate();
        else
            db.Database.EnsureCreated();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Erro ao migrar/criar banco");
        // em dev, tenta EnsureCreated
        try { db.Database.EnsureCreated(); } catch { }
    }
}

app.UseDefaultFiles();
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
