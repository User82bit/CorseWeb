using CorseWeb.Server.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace CorseWeb.Server.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261123140000_AddCourseExerciseAttempts")]
public partial class AddCourseExerciseAttempts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "CourseExerciseAttempts",
            columns: table => new
            {
                Id = table.Column<string>(type: "TEXT", nullable: false),
                EnrollmentId = table.Column<string>(type: "TEXT", nullable: false),
                LessonId = table.Column<string>(type: "TEXT", nullable: false),
                ExerciseNodeId = table.Column<string>(type: "TEXT", nullable: false),
                SubmittedAnswer = table.Column<string>(type: "TEXT", maxLength: 20000, nullable: false),
                IsCorrect = table.Column<bool>(type: "INTEGER", nullable: false),
                Passed = table.Column<bool>(type: "INTEGER", nullable: false),
                Score = table.Column<int>(type: "INTEGER", nullable: false),
                CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_CourseExerciseAttempts", x => x.Id);
                table.ForeignKey(
                    name: "FK_CourseExerciseAttempts_Enrollments_EnrollmentId",
                    column: x => x.EnrollmentId,
                    principalTable: "Enrollments",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_CourseExerciseAttempts_EnrollmentId_LessonId_ExerciseNodeId",
            table: "CourseExerciseAttempts",
            columns: new[] { "EnrollmentId", "LessonId", "ExerciseNodeId" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "CourseExerciseAttempts");
    }
}
