"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Node extends d3.SimulationNodeDatum {
  id: number;
  name: string;
  category: string;
}

interface Link {
  source: number;
  target: number;
}

const DummyGraph = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 1900;
    const height = 700;

    // Helper function to generate a random point inside an ellipse
    function randomPointInEllipse(
      cx: number,
      cy: number,
      rx: number,
      ry: number
    ) {
      const angle = Math.random() * 2 * Math.PI;
      const r = Math.sqrt(Math.random());
      const x = cx + r * rx * Math.cos(angle);
      const y = cy + r * ry * Math.sin(angle);
      return { x, y };
    }

    // Create 50 nodes with positions arranged like a brain:
    // - First 20 nodes in the left lobe (ellipse centered at width/3, height/2)
    // - Next 20 nodes in the right lobe (ellipse centered at 2*width/3, height/2)
    // - Last 10 nodes in the central region (ellipse centered at width/2, height/2)
    const nodes: Node[] = Array.from({ length: 50 }, (_, i) => {
      let pos;
      if (i < 20) {
        // Left lobe
        pos = randomPointInEllipse(width / 3, height / 2, 150, 120);
      } else if (i < 40) {
        // Right lobe
        pos = randomPointInEllipse((2 * width) / 3, height / 2, 150, 120);
      } else {
        // Central connection
        pos = randomPointInEllipse(width / 2, height / 2, 100, 80);
      }
      return {
        id: i,
        name: `Node ${i + 1}`,
        category: "default",
        x: pos.x,
        y: pos.y,
      };
    });

    // Generate random links between nodes.
    // These are still random and may connect nodes from different lobes.
    const links: Link[] = Array.from({ length: 60 }, () => ({
      source: Math.floor(Math.random() * 50),
      target: Math.floor(Math.random() * 50),
    }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const simulation = d3
      .forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "link",
        d3
          .forceLink<Node, Link>(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force("collision", d3.forceCollide().radius(50));

    const link = svg
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#58A6FF")
      .attr("stroke-width", 1);

    const node = svg
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", 8)
      .attr("fill", "#C9D1D9")
      .attr("stroke", "#1e1e2e")
      .attr("stroke-width", 2)
      .call(
        d3
          .drag<SVGCircleElement, Node>()
          .on("start", dragStart)
          .on("drag", dragged)
          .on("end", dragEnd)
      );

    node.append("title").text((d) => d.name);

    const ticked = () => {
      link
        .attr("x1", (d) => (d.source as unknown as Node).x ?? 0)
        .attr("y1", (d) => (d.source as unknown as Node).y ?? 0)
        .attr("x2", (d) => (d.target as unknown as Node).x ?? 0)
        .attr("y2", (d) => (d.target as unknown as Node).y ?? 0);

      node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
    };

    simulation.on("tick", ticked);

    function dragStart(
      event: d3.D3DragEvent<SVGCircleElement, Node, Node>,
      d: Node
    ) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(
      event: d3.D3DragEvent<SVGCircleElement, Node, Node>,
      d: Node
    ) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnd(
      event: d3.D3DragEvent<SVGCircleElement, Node, Node>,
      d: Node
    ) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, []);

  return <svg ref={svgRef}></svg>;
};

export default DummyGraph;
