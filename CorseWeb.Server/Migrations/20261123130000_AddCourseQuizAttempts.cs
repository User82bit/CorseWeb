using CorseWeb.Server.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace CorseWeb.Server.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261123130000_AddCourseQuizAttempts")]
public partial class AddCourseQuizAttempts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "CourseQuizAttempts",
            columns: table => new
            {
                Id = table.Column<string>(type: "TEXT", nullable: false),
                EnrollmentId = table.Column<string>(type: "TEXT", nullable: false),
                LessonId = table.Column<string>(type: "TEXT", nullable: false),
                QuizNodeId = table.Column<string>(type: "TEXT", nullable: false),
                SelectedOptionIndex = table.Column<int>(type: "INTEGER", nullable: false),
                IsCorrect = table.Column<bool>(type: "INTEGER", nullable: false),
                Passed = table.Column<bool>(type: "INTEGER", nullable: false),
                Score = table.Column<int>(type: "INTEGER", nullable: false),
                CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_CourseQuizAttempts", x => x.Id);
                table.ForeignKey(
                    name: "FK_CourseQuizAttempts_Enrollments_EnrollmentId",
                    column: x => x.EnrollmentId,
                    principalTable: "Enrollments",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_CourseQuizAttempts_EnrollmentId_LessonId_QuizNodeId",
            table: "CourseQuizAttempts",
            columns: new[] { "EnrollmentId", "LessonId", "QuizNodeId" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "CourseQuizAttempts");
    }
}
