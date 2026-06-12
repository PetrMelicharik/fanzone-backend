# Fotbal App – Backend

Jednoduchý Node.js server, který načítá RSS feedy českých sportovních médií a filtruje články podle fotbalových klubů.

## Instalace

```bash
cd backend
npm install
```

## Spuštění (vývoj)

```bash
npm run dev
```

## Spuštění (produkce)

```bash
npm start
```

Server poběží na `http://localhost:3000`.

## API endpointy

### `GET /api/clubs`
Vrátí seznam všech klubů Chance ligy.

```json
[
  {
    "slug": "slavia-praha",
    "name": "SK Slavia Praha",
    "city": "Praha",
    "abbr": "SLA",
    "color": "#CC0000",
    "keywords": ["Slavia", "SK Slavia", "Slavia Praha"]
  },
  ...
]
```

### `GET /api/articles/:clubSlug`
Vrátí aktuální články pro daný klub (filtrované ze všech RSS feedů).

Příklad: `GET /api/articles/slavia-praha`

```json
{
  "articles": [
    {
      "id": "...",
      "title": "Slavia podepsala nového útočníka",
      "perex": "...",
      "url": "https://isport.blesk.cz/...",
      "publishedAt": "2024-03-15T10:30:00.000Z",
      "source": "iSport.cz",
      "sourceColor": "#E30613",
      "image": "https://..."
    }
  ],
  "fromCache": false
}
```

### `GET /api/articles`
Vrátí všechny nejnovější články ze všech feedů (bez filtrování).

## RSS zdroje
- **iSport.cz** – isport.blesk.cz
- **Sport.cz** – sport.cz
- **Fotbal.cz** – fotbal.cz
- **ČT Sport** – sport.ceskatelevize.cz
- **Deník.cz** – denik.cz

## Cache
Články jsou cachované na **10 minut**, aby se RSS feedy nenačítaly při každém requestu.

## Nasazení zdarma
Server lze zdarma nasadit na:
- [Render.com](https://render.com) – doporučeno, free tier
- [Railway.app](https://railway.app)
- [Fly.io](https://fly.io)
