using System.Data;
using CorseWeb.Server.Data;
using Microsoft.EntityFrameworkCore;

namespace CorseWeb.Server.Helpers;

/// <summary>
/// Keeps older SQLite databases compatible with the nullable PasswordHash column.
/// This remains necessary for databases created before PasswordHash was represented
/// by a versioned migration.
/// </summary>
public static class SqliteSchemaCompatibility
{
    public static void EnsurePasswordHashColumn(AppDbContext db)
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
}
