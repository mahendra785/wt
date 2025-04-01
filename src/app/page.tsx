// components/Home.tsx
"use client";
import { useState } from "react";
import Landing from "./components/landing";
import Graph from "./components/graph";

const Home = () => {
  const [githubUrl, setGithubUrl] = useState<string>(
    "https://github.com/ACM-VIT/ExamCooker-2024"
  );

  return !githubUrl ? (
    <Landing githubUrl={githubUrl} setGithubUrl={setGithubUrl} />
  ) : (
    <Graph githubUrl={githubUrl} />
  );
};

export default Home;
