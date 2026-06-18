using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FitBot.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialPostgres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "stopwords",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    word = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stopwords", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "synonyms",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    keyword = table.Column<string>(type: "text", nullable: false),
                    synonymsraw = table.Column<string>(type: "text", nullable: false),
                    isnew = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_synonyms", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    username = table.Column<string>(type: "text", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    passwordhash = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    passwordresettoken = table.Column<string>(type: "text", nullable: true),
                    passwordresettokenexpiresat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "videos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    title = table.Column<string>(type: "text", nullable: false),
                    link = table.Column<string>(type: "text", nullable: false),
                    tagsraw = table.Column<string>(type: "text", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_videos", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "bmilogs",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    height = table.Column<float>(type: "real", nullable: false),
                    weight = table.Column<float>(type: "real", nullable: false),
                    bmivalue = table.Column<float>(type: "real", nullable: false),
                    daterecorded = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    userid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bmilogs", x => x.id);
                    table.ForeignKey(
                        name: "FK_bmilogs_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "chathistories",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: false),
                    sessionid = table.Column<string>(type: "text", nullable: false),
                    role = table.Column<string>(type: "text", nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chathistories", x => x.id);
                    table.ForeignKey(
                        name: "FK_chathistories_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "chathistory",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: false),
                    message = table.Column<string>(type: "text", nullable: false),
                    isbot = table.Column<bool>(type: "boolean", nullable: false),
                    timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chathistory", x => x.id);
                    table.ForeignKey(
                        name: "FK_chathistory_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "deepmemories",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: false),
                    memorykey = table.Column<string>(type: "text", nullable: false),
                    memoryvalue = table.Column<string>(type: "text", nullable: false),
                    category = table.Column<string>(type: "text", nullable: true),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_deepmemories", x => x.id);
                    table.ForeignKey(
                        name: "FK_deepmemories_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "dietplans",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    plantype = table.Column<string>(type: "text", nullable: false),
                    planjson = table.Column<string>(type: "text", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    isactive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dietplans", x => x.id);
                    table.ForeignKey(
                        name: "FK_dietplans_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "exerciseplans",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    splittype = table.Column<string>(type: "text", nullable: false),
                    planjson = table.Column<string>(type: "text", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    isactive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exerciseplans", x => x.id);
                    table.ForeignKey(
                        name: "FK_exerciseplans_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "likedvideos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    userid = table.Column<int>(type: "integer", nullable: false),
                    videoid = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    thumbnailurl = table.Column<string>(type: "text", nullable: true),
                    youtubeurl = table.Column<string>(type: "text", nullable: false),
                    likedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_likedvideos", x => x.id);
                    table.ForeignKey(
                        name: "FK_likedvideos_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "userprofiles",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    age = table.Column<int>(type: "integer", nullable: false),
                    gender = table.Column<string>(type: "text", nullable: false),
                    height = table.Column<float>(type: "real", nullable: false),
                    weight = table.Column<float>(type: "real", nullable: false),
                    bmivalue = table.Column<float>(type: "real", nullable: false),
                    isbmifromai = table.Column<bool>(type: "boolean", nullable: false),
                    targetweight = table.Column<float>(type: "real", nullable: false),
                    healthissues = table.Column<string>(type: "text", nullable: false),
                    userid = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_userprofiles", x => x.id);
                    table.ForeignKey(
                        name: "FK_userprofiles_users_userid",
                        column: x => x.userid,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "referencemotions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    videoid = table.Column<int>(type: "integer", nullable: false),
                    exercisename = table.Column<string>(type: "text", nullable: false),
                    totalframesprocessed = table.Column<int>(type: "integer", nullable: false),
                    motionpatternjson = table.Column<string>(type: "text", nullable: false),
                    framesdatajson = table.Column<string>(type: "text", nullable: false),
                    videometadatajson = table.Column<string>(type: "text", nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updatedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_referencemotions", x => x.id);
                    table.ForeignKey(
                        name: "FK_referencemotions_videos_videoid",
                        column: x => x.videoid,
                        principalTable: "videos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "videomotionpatterns",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    videoid = table.Column<int>(type: "integer", nullable: false),
                    exercisename = table.Column<string>(type: "text", nullable: false),
                    totalframes = table.Column<int>(type: "integer", nullable: false),
                    fps = table.Column<double>(type: "double precision", nullable: false),
                    framesjson = table.Column<string>(type: "text", nullable: false),
                    motionpatternjson = table.Column<string>(type: "text", nullable: false),
                    processedat = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_videomotionpatterns", x => x.id);
                    table.ForeignKey(
                        name: "FK_videomotionpatterns_videos_videoid",
                        column: x => x.videoid,
                        principalTable: "videos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_bmilogs_userid",
                table: "bmilogs",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_chathistories_userid",
                table: "chathistories",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_chathistory_userid",
                table: "chathistory",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_deepmemories_userid_memorykey",
                table: "deepmemories",
                columns: new[] { "userid", "memorykey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_dietplans_userid",
                table: "dietplans",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_exerciseplans_userid",
                table: "exerciseplans",
                column: "userid");

            migrationBuilder.CreateIndex(
                name: "IX_likedvideos_userid_videoid",
                table: "likedvideos",
                columns: new[] { "userid", "videoid" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_referencemotions_videoid",
                table: "referencemotions",
                column: "videoid");

            migrationBuilder.CreateIndex(
                name: "IX_userprofiles_userid",
                table: "userprofiles",
                column: "userid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_videomotionpatterns_videoid",
                table: "videomotionpatterns",
                column: "videoid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "bmilogs");

            migrationBuilder.DropTable(
                name: "chathistories");

            migrationBuilder.DropTable(
                name: "chathistory");

            migrationBuilder.DropTable(
                name: "deepmemories");

            migrationBuilder.DropTable(
                name: "dietplans");

            migrationBuilder.DropTable(
                name: "exerciseplans");

            migrationBuilder.DropTable(
                name: "likedvideos");

            migrationBuilder.DropTable(
                name: "referencemotions");

            migrationBuilder.DropTable(
                name: "stopwords");

            migrationBuilder.DropTable(
                name: "synonyms");

            migrationBuilder.DropTable(
                name: "userprofiles");

            migrationBuilder.DropTable(
                name: "videomotionpatterns");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "videos");
        }
    }
}
