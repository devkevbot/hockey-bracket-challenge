# This project is now archived, thanks for playing!

## A small project used to record my predictions for the 2023 NHL Playoffs.

![image](https://user-images.githubusercontent.com/31908183/235287852-a79b943e-39e5-4e88-9fc0-e6ff21158def.png)

---

## User Guide

### Making predictions

1. Visit https://hockey-bracket-challenge.vercel.app/
1. Click "Sign in" and sign in with your Discord account
1. For each available series, select your prediction

### Prediction outcomes

Your "score" is based on how correct you were; maximum points are earned for guessing _both_ the correct series winner _and_ the correct series length in games.

The breakdown is as follows:

- **Correct with bonus** Both the series winner and series length is correct.
- **Correct** Only the series winner is correct.
- **Incorrect** The series winner is incorrect.

---

## Developer Guide (so I don't forget in 6 months)

### Deployment

- This project is hosted on [Vercel](https://vercel.com)
- Any changes to the `master` branch automatically trigger a deployment from Vercel

### Local setup

1. If cloning this as a fresh project, pull in the environment variables (requires Vercel link/authorization) to your local `.env` file

```sh
npm run env-pull

# Delete any VERCEL_* variables that get pulled in, they aren't needed and WILL break local dev
```

2. Install the [PlanetScale CLI](https://github.com/planetscale/cli#installation)

3. Initialize the DB proxy to Prisma via PlanetScale

```sh
npm run db-proxy
```

4. In a new terminal, seed the database

```sh
npm run db-seed
```

5. Start the application

```sh
npm run dev
```

6. Go to the [localhost link](http://localhost:3000) that was output to the console

7. (Optional) In a new terminal, view the database using Prisma studio

```
npm run db-studio
```

### Making database schema changes

1. Ensure the database proxy is running

```sh
npm run db-proxy
```

2. Push local schema changes to the PlanetScale `dev` branch

```sh
npm run db-push
```

3. Regenerate Prisma client types (must do after every schema change)

```sh
npm run db-generate
```

4. Restart TypeScript server

- Use your IDE or language server commands to do this. In VS Code, open a TypeScript or TSX file, then: `CTRL+SHIFT+P > TypeScript: Restart TS Server`

5. Once confident, make a database deploy request using the command below, then merge `dev` into the PlanetScale `main` branch

```sh
npm run db-deploy-request
````
