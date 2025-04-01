"use client";
import { useEffect, useState } from "react";
import Graph from "./components/graph";
import Landing from "./components/landing";
interface Node extends d3.SimulationNodeDatum {
  id: number;
  name: string;
  category: string;
  path?: string;
  color?: string;
  content?: string;
  dependencies?: string[];
}

interface Link {
  source: number;
  target: number;
  relation: string;
  strength?: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}
const App = () => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const response = await fetch(
          "https://762e-128-185-112-57.ngrok-free.app/receive",
          {
            method: "POST",
            headers: {
              "Content-Type": "text/plain",
              Accept: "application/json",
            },
            body: "github_link=https://github.com/ACM-VIT/ExamCooker-2024",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch graph data");
        }

        const data: GraphData = await response.json();
        // Add random colors to each node
        data.nodes = data.nodes.map((node) => ({
          ...node,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        }));
        setGraphData(data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch graph data:", error);
        setError(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
        setLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div>{graphData ? <Graph {...graphData} /> : <Landing />}</div>;
};

export default App;
