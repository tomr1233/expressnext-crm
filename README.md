# ExpressNext CRM

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A full-stack, modern Customer Relationship Management (CRM) application built with Next.js for the frontend and Express.js for the backend API. It uses Prisma as the ORM to interact with a PostgreSQL database and is written entirely in TypeScript.

> **Note:** This project is currently in development.

<!-- **[Live Demo](your-live-demo-url)** -->

---


> *Suggestion: Replace the image above with a real screenshot of your application!*

## ✨ Features

Based on the current schema, the application supports:

-   **🔐 Secure User Authentication**: JWT-based authentication for registering and logging in users.
-   **👤 Contact Management**: Full CRUD (Create, Read, Update, Delete) functionality for customer contacts.
-   **📈 Interaction Logging**: Ability to log interactions (e.g., calls, emails, meetings) with specific contacts.
-   **🤝 Relational Data**: Contacts and Interactions are linked to the users who manage them.
-   **🚀 Modern UI**: A clean and responsive user interface built with Tailwind CSS and shadcn/ui.

## 🛠️ Tech Stack

This project is a monorepo containing a separate client and API.

| Category      | Technology                                                                                                    |
|---------------|---------------------------------------------------------------------------------------------------------------|
| **Frontend**  | [**Next.js 14**](https://nextjs.org/) (with App Router), [**React**](https://react.dev/), [**Tailwind CSS**](https://tailwindcss.com/), [**shadcn/ui**](https://ui.shadcn.com/) |
| **Backend**   | [**Express.js**](https://expressjs.com/), [**JWT**](https://jwt.io/) (for authentication), [**CORS**](https://expressjs.com/en/resources/middleware/cors.html)                |
| **Database**  | [**PostgreSQL**](https://www.postgresql.org/), [**Prisma ORM**](https://www.prisma.io/)                          |
| **Language**  | [**TypeScript**](https://www.typescriptlang.org/)                                                             |
| **Tooling**   | [**pnpm**](https://pnpm.io/) (as package manager), [**Concurrently**](https://github.com/open-cli-tools/concurrently) (to run both servers) |

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have the following software installed on your system:

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   [pnpm](https://pnpm.io/installation) (used as the package manager for this project)
-   [PostgreSQL](https://www.postgresql.org/download/) or Docker to run a PostgreSQL instance.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/tomr1233/expressnext-crm.git
    cd expressnext-crm
    ```

2.  **Install dependencies:**
    This project uses `pnpm` workspaces. The root `package.json` has a script to install all dependencies for both the `client` and `api` workspaces.
    ```bash
    pnpm install:all
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the `api` directory by copying the example file.
    ```bash
    cp api/.env.example api/.env
    ```
    Now, open `api/.env` and update the variables:
    -   `DATABASE_URL`: Your PostgreSQL connection string.
        -   Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`
        -   Example: `postgresql://postgres:mysecretpassword@localhost:5432/crm_dev`
    -   `JWT_SECRET`: A long, random, and secret string for signing JWTs.

4.  **Set up the database:**
    Run the Prisma migrate command to sync the database schema and create the necessary tables.
    ```bash
    pnpm prisma:migrate
    ```
    This command executes `prisma migrate dev --name init` as defined in the root `package.json`.

5.  **Run the development servers:**
    The `dev` script at the root level uses `concurrently` to start both the Next.js frontend and the Express.js backend at the same time.
    ```bash
    pnpm dev
    ```

    -   The **API** will be running on `http://localhost:3001` (or your configured port).
    -   The **Client** will be running on `http://localhost:3000`.

You can now open your browser and navigate to `http://localhost:3000` to see the application in action!

## 📂 Project Structure

The repository is structured as a monorepo with two main packages:

```
.
├── api/                # Backend (Express.js API)
│   ├── prisma/         # Prisma schema and migrations
│   ├── src/            # API source code
│   ├── .env.example    # Environment variable template
│   └── package.json
│
├── client/             # Frontend (Next.js App)
│   ├── src/            # Client source code (components, pages, etc.)
│   └── package.json
│
├── .gitignore
├── package.json        # Root package file with scripts for managing the monorepo
├── pnpm-lock.yaml
└── README.md
```

## 🤝 Contributing

Contributions are welcome! If you have suggestions for improving the app, please feel free to open an issue or submit a pull request.

1.  **Fork** the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a **Pull Request**.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for details.
> *Suggestion: Create a `LICENSE.md` file in your root directory with the MIT License text.*