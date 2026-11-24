using CorseWeb.Server.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace CorseWeb.Server.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261124100000_AddCorseLightRuntimeStorage")]
public partial class AddCorseLightRuntimeStorage : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "ScriptsJson",
            table: "Courses",
            type: "TEXT",
            nullable: false,
            defaultValue: "[]");

        migrationBuilder.AddColumn<string>(
            name: "ScriptsJson",
            table: "CourseDrafts",
            type: "TEXT",
            nullable: false,
            defaultValue: "[]");

        migrationBuilder.CreateTable(
            name: "CourseScriptStates",
            columns: table => new
            {
                Id = table.Column<string>(type: "TEXT", nullable: false),
                EnrollmentId = table.Column<string>(type: "TEXT", nullable: false),
                ScriptId = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                Key = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                ValueJson = table.Column<string>(type: "TEXT", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_CourseScriptStates", x => x.Id);
                table.ForeignKey(
                    name: "FK_CourseScriptStates_Enrollments_EnrollmentId",
                    column: x => x.EnrollmentId,
                    principalTable: "Enrollments",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "CourseScriptExecutions",
            columns: table => new
            {
                Id = table.Column<string>(type: "TEXT", nullable: false),
                EnrollmentId = table.Column<string>(type: "TEXT", nullable: false),
                CourseId = table.Column<string>(type: "TEXT", nullable: false),
                LessonId = table.Column<string>(type: "TEXT", nullable: false),
                EventName = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                SourceEventId = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                ScriptId = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                ResultJson = table.Column<string>(type: "TEXT", nullable: false),
                Failed = table.Column<bool>(type: "INTEGER", nullable: false),
                DiagnosticCode = table.Column<string>(type: "TEXT", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_CourseScriptExecutions", x => x.Id);
                table.ForeignKey(
                    name: "FK_CourseScriptExecutions_Enrollments_EnrollmentId",
                    column: x => x.EnrollmentId,
                    principalTable: "Enrollments",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_CourseScriptStates_EnrollmentId_ScriptId_Key",
            table: "CourseScriptStates",
            columns: new[] { "EnrollmentId", "ScriptId", "Key" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_CourseScriptExecutions_EnrollmentId_LessonId_EventName_SourceEventId_ScriptId",
            table: "CourseScriptExecutions",
            columns: new[] { "EnrollmentId", "LessonId", "EventName", "SourceEventId", "ScriptId" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "CourseScriptExecutions");
        migrationBuilder.DropTable(name: "CourseScriptStates");
        migrationBuilder.DropColumn(name: "ScriptsJson", table: "Courses");
        migrationBuilder.DropColumn(name: "ScriptsJson", table: "CourseDrafts");
    }
}
