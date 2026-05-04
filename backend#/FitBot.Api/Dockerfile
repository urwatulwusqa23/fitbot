FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["FitBot.Api.csproj", "."]
RUN dotnet restore "FitBot.Api.csproj"
COPY . .
RUN dotnet build "FitBot.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "FitBot.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Render assigns a random PORT — this tells .NET to listen on it
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}

ENTRYPOINT ["dotnet", "FitBot.Api.dll"]


#FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
#WORKDIR /app
#EXPOSE 80
#EXPOSE 443
#
#FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
#WORKDIR /src
#COPY ["FitBot.Api.csproj", "."]
#RUN dotnet restore "FitBot.Api.csproj"
#COPY . .
#RUN dotnet build "FitBot.Api.csproj" -c Release -o /app/build
#
#FROM build AS publish
#RUN dotnet publish "FitBot.Api.csproj" -c Release -o /app/publish
#
#FROM base AS final
#WORKDIR /app
#COPY --from=publish /app/publish .
#ENTRYPOINT ["dotnet", "FitBot.Api.dll"]
