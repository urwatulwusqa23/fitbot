using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FitBot.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVideoMotionPatterns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VideoMotionPatterns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    VideoId = table.Column<int>(type: "int", nullable: false),
                    ExerciseName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TotalFrames = table.Column<int>(type: "int", nullable: false),
                    Fps = table.Column<double>(type: "float", nullable: false),
                    FramesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MotionPatternJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VideoMotionPatterns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VideoMotionPatterns_Videos_VideoId",
                        column: x => x.VideoId,
                        principalTable: "Videos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VideoMotionPatterns_VideoId",
                table: "VideoMotionPatterns",
                column: "VideoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VideoMotionPatterns");
        }
    }
}
