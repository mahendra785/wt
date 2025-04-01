"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

const DummyGraph = () => {
  const svgRef = useRef(null);

  useEffect(() => {
    const nodes = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      name: `Node ${i + 1}`,
      x: Math.random() * 800,
      y: Math.random() * 600,
      category: "default",
    }));

    const links = Array.from({ length: 60 }, () => ({
      source: Math.floor(Math.random() * 30),
      target: Math.floor(Math.random() * 30),
    }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1000;
    const height = 700;

    svg.attr("width", width).attr("height", height);

    const simulation = d3
      .forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "link",
        d3
          .forceLink(links)
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
        d3.drag().on("start", dragStart).on("drag", dragged).on("end", dragEnd)
      );

    node.append("title").text((d) => d.name);

    const ticked = () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    };

    simulation.on("tick", ticked);

    function dragStart(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnd(event, d) {
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
