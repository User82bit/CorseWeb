using CorseWeb.Server.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace CorseWeb.Server.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261117120000_AddCourseLessonCompletions")]
public partial class AddCourseLessonCompletions : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "CourseLessonCompletions",
            columns: table => new
            {
                Id = table.Column<string>(type: "TEXT", nullable: false),
                EnrollmentId = table.Column<string>(type: "TEXT", nullable: false),
                LessonId = table.Column<string>(type: "TEXT", nullable: false),
                CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_CourseLessonCompletions", x => x.Id);
                table.ForeignKey(
                    name: "FK_CourseLessonCompletions_Enrollments_EnrollmentId",
                    column: x => x.EnrollmentId,
                    principalTable: "Enrollments",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_CourseLessonCompletions_EnrollmentId_LessonId",
            table: "CourseLessonCompletions",
            columns: new[] { "EnrollmentId", "LessonId" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "CourseLessonCompletions");
    }
}