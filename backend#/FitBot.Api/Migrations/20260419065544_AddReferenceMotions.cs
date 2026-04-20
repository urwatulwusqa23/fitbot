using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FitBot.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReferenceMotions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReferenceMotions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VideoId = table.Column<int>(type: "int", nullable: false),
                    ExerciseName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TotalFramesProcessed = table.Column<int>(type: "int", nullable: false),
                    MotionPatternJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FramesDataJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VideoMetadataJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferenceMotions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReferenceMotions_Videos_VideoId",
                        column: x => x.VideoId,
                        principalTable: "Videos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceMotions_VideoId",
                table: "ReferenceMotions",
                column: "VideoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReferenceMotions");
        }
    }
}
