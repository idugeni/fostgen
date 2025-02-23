# Folder Structure Generator

<div align="center">

![GitHub Repo stars](https://img.shields.io/github/stars/idugeni/fostgen?style=for-the-badge)
![GitHub forks](https://img.shields.io/github/forks/idugeni/fostgen?style=for-the-badge)
![GitHub issues](https://img.shields.io/github/issues/idugeni/fostgen?style=for-the-badge)
![GitHub license](https://img.shields.io/github/license/idugeni/fostgen?style=for-the-badge)
![GitHub last commit](https://img.shields.io/github/last-commit/idugeni/fostgen?style=for-the-badge)
![GitHub contributors](https://img.shields.io/github/contributors/idugeni/fostgen?style=for-the-badge)

</div>

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Project Structure

```bash
fostgen
├─ public
│  ├─ favicon.png
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ src
│  ├─ app
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ components
│  │  ├─ Header.tsx
│  │  ├─ InputForm.tsx
│  │  ├─ Notification.tsx
│  │  └─ OutputDisplay.tsx
│  └─ utils
│     └─ githubApi.ts
├─ .gitignore
├─ eslint.config.mjs
├─ LICENCE
├─ next.config.ts
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ README.md
├─ tsconfig.json
└─ turbo.json
```

## Introduction

Folder Structure Generator is a tool that allows users to generate elegant folder structure visualizations from any GitHub repository.

## Features

- Fetches and displays folder structure from public GitHub repositories.
- Provides a clean markdown output.
- Copy or download the generated folder structure.
- User-friendly UI with Tailwind CSS.

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/idugeni/fostgen.git
   ```

2. Navigate to the project directory:

   ```sh
   cd fostgen
   ```

3. Install dependencies:

   ```sh
   npm install
   ```

4. Start the development server:

   ```sh
   npm run dev
   ```

## Usage

1. Open the application in your browser.
2. Enter a valid GitHub repository URL.
3. Click on `"Generate Structure"` to fetch and display the folder structure.
4. Copy or download the generated markdown file.

## Contributing

Contributions are welcome! Follow these steps:

1. Fork the repository.

2. Create a new branch:

   ```sh
   git checkout -b feature-branch
   ```

3. Make your changes and commit them:

   ```sh
   git commit -m "Add new feature"
   ```

4. Push to your forked repository:

   ```sh
   git push origin feature-branch
   ```

5. Create a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE). See the LICENSE file for details.
