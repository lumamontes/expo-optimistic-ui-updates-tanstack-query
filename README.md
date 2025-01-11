# Optimistic UI Updates with React Native and React Query


https://github.com/user-attachments/assets/0b6482f8-7c67-493b-a3d1-e213f58f37e6

This project demonstrates how to implement optimistic UI updates in a React Native application using react-query, SQLite, and a local database to manage likes on posts. In a real app, this could be connected to an API.

## Example

This example shows how to like and unlike posts in a React Native app. The central idea is to update the UI as soon as the user interacts, then reconcile with the database asynchronously.

## Technologies 

- **SQLite**: Local database to store posts and user interactions.
- **react-query**: Manages queries, mutations, and cache.
- **expo-router**: Navigation system for the app.
