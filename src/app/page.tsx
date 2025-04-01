// import ORMVisualizer from "./components/orm";

// const prismaSchema = `
// model User {
//   id       Int      @id @default(autoincrement())
//   email    String   @unique
//   name     String?
//   posts    Post[]   // 1:n relationship
//   profile  Profile? // 1:1 optional relationship
//   groups   Group[]  // m:n relationship
//   favoritePosts Post[] @relation("FavoritePosts")
// }

// model Post {
//   id       Int     @id @default(autoincrement())
//   title    String
//   content  String?
//   author   User    @relation(fields: [authorId], references: [id])
//   authorId Int     // Foreign key
//   favorites User[] @relation("FavoritePosts")
// }

// model Profile {
//   id     Int     @id @default(autoincrement())
//   bio    String?
//   user   User    @relation(fields: [userId], references: [id])
//   userId Int     @unique // Foreign key
// }

// model Group {
//   id     Int     @id @default(autoincrement())
//   name   String
//   users  User[]
// }
// `;

// function App() {
//   return <ORMVisualizer schema={prismaSchema} />;
// }

// export default App;

import react from "react";
import Graph from "./components/graph";
const App = () => {
  return (
    <div>
      <Graph />
    </div>
  );
};
export default App;
