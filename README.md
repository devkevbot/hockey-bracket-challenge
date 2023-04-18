# Hockey Bracket Challenge

A small project used to record my predictions for the 2023 NHL Playoffs. Available at https://hockey-bracket-challenge.vercel.app/

![image](https://user-images.githubusercontent.com/31908183/232652006-0b23906a-ab5d-4844-9d4f-a615207c5615.png)

---

## User Guide

### Making predictions

1. Visit https://hockey-bracket-challenge.vercel.app/
1. Click "Sign in" and sign in with your Discord account
1. For each available series, select your prediction

### Prediction outcomes

Your "score" is based on how correct you were; maximum points are earned for guessing _both_ the correct series winner _and_ the correct series length in games.

The breakdown is as follows:

- **Exactly correct** Both the series winner and series length is correct.
- **Partially correct** Only the series winner or series length is correct.
- **Incorrect** Both the series winner and series length is incorrect.

---

## Developer Guide (so I don't forget in 6 months)

### Deployment

- This is project is hosted on [Vercel](https://vercel.com)
- Any changes to the `master` branch automatically trigger a deployment from Vercel

### Local setup

1. If cloning this as a fresh project, pull in the environment variables (requires Vercel link/authorization):

```sh
npm run env-pull

# Delete any VERCEL_* variables that get pulled in, they aren't needed and can break local dev
```

2. Install the PlanetScale CLI

3. Initialize a DB proxy to Prisma via PlanetScale

```sh
npm run db-proxy
```

4. In a second terminal, seed the database

```sh
npm run db-seed
```

5. Re-using the second terminal, start the proxy

```sh
npm run dev
```

6. (Optional) In a third terminal, view the database using Prisma studio

```
npm run db-studio
```

### Making database schema changes

1. Ensure the database proxy is running

```sh
npm run db-proxy
```

2. Push local schema changes to PlanetScale `dev` branch

```sh
npm run db-push
```

3. Regenerate Prisma client types (must do after every schema change)

```sh
npm run db-generate
```

4. Restart TypeScript server

- Use your IDE or language server commands to do this. In VS Code, open a TypeScript or TSX file, then: `CTRL+SHIFT+P > TypeSCript: Restart TS Server`

5. Once confident, make a database deploy-request and marge into the PlanetScale `main` branch

```sh
npm run db-deploy-request
````
