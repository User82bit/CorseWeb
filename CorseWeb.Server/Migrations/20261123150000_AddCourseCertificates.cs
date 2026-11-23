using CorseWeb.Server.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace CorseWeb.Server.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261123150000_AddCourseCertificates")]
public partial class AddCourseCertificates : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "CourseCertificates",
            columns: table => new
            {
                Id = table.Column<string>(type: "TEXT", nullable: false),
                EnrollmentId = table.Column<string>(type: "TEXT", maxLength: 36, nullable: false),
                CourseId = table.Column<string>(type: "TEXT", maxLength: 36, nullable: false),
                VerificationCode = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                StudentName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                CourseTitle = table.Column<string>(type: "TEXT", maxLength: 240, nullable: false),
                AuthorName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                CourseVersion = table.Column<int>(type: "INTEGER", nullable: false),
                CourseCompletedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                IssuedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_CourseCertificates", x => x.Id));

        migrationBuilder.CreateIndex(
            name: "IX_CourseCertificates_EnrollmentId",
            table: "CourseCertificates",
            column: "EnrollmentId",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_CourseCertificates_VerificationCode",
            table: "CourseCertificates",
            column: "VerificationCode",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "CourseCertificates");
    }
}
