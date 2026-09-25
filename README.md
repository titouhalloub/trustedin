# Trustedin Application

Trustedin is a full-stack SaaS application designed for identity, credential, and trust verification. It provides a unique Trust Score system, document verification, and B2B integrations, aiming to enhance trust in online interactions.

## Features

- **Trust Score System**: A dynamic score ranging from 0 to 100 that reflects a user's trustworthiness based on various factors.
- **Document Verification**: Users can upload documents such as IDs, diplomas, and work certificates for verification.
- **Reputation Management**: A graph-based reputation system that visualizes user trust and interactions.
- **Admin Dashboard**: A dedicated interface for administrators to manage users, institutions, and monitor analytics.
- **Institutional API**: RESTful API endpoints for institutions to verify credentials and manage their interactions with the Trustedin platform.

## Tech Stack

- **Frontend**: React (Next.js, TailwindCSS, TypeScript)
- **Backend**: Node.js (Express or NestJS) or FastAPI (Python)
- **Database**: Supabase (Postgres + Auth + Storage)
- **Event System**: Upstash Kafka + Redis
- **Graph Database**: Neo4j Aura Free
- **Hosting**: Vercel (frontend), Fly.io/Railway (backend)
- **Authentication**: Supabase Auth (JWT)
- **Monitoring**: Sentry + Doppler

## Getting Started

### Prerequisites

- Node.js
- npm or yarn
- Supabase account
- Neo4j account
- Kafka account

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd trustedin-app
   ```

2. Install dependencies for the frontend:
   ```
   cd apps/frontend
   npm install
   ```

3. Install dependencies for the backend:
   ```
   cd ../backend
   npm install
   ```

4. Set up Supabase and Neo4j, and configure environment variables as needed.

### Running the Application

- Start the frontend:
  ```
  cd apps/frontend
  npm run dev
  ```

- Start the backend:
  ```
  cd apps/backend
  npm run dev
  ```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.