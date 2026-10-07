import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const NODE_COLOR = {
  root: '#0EA894',
  default: '#8996AC',
}

export default function LinkageGraph({ data, width = 720, height = 440 }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!data || !data.nodes?.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const nodes = data.nodes.map((n) => ({ ...n }))
    const links = data.links.map((l) => ({ ...l }))
    const rootId = nodes[0]?.id

    const simulation = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => d.id).distance(120).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(38))

    const link = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#233052')
      .attr('stroke-width', 1.5)

    const linkLabel = svg
      .append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('font-size', 9)
      .attr('fill', '#5C6B85')
      .attr('font-family', 'IBM Plex Mono, monospace')
      .text((d) => d.edge_type?.replaceAll('_', ' ').toLowerCase())

    const node = svg
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d) => (d.id === rootId ? 16 : 12))
      .attr('fill', (d) => (d.id === rootId ? NODE_COLOR.root : NODE_COLOR.default))
      .attr('fill-opacity', 0.85)
      .attr('stroke', '#0A0F1C')
      .attr('stroke-width', 2)
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    const label = svg
      .append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('font-size', 10)
      .attr('font-family', 'IBM Plex Mono, monospace')
      .attr('fill', '#E7ECF3')
      .attr('text-anchor', 'middle')
      .attr('dy', 28)
      .text((d) => d.tracking_code)

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)

      linkLabel
        .attr('x', (d) => (d.source.x + d.target.x) / 2)
        .attr('y', (d) => (d.source.y + d.target.y) / 2)

      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y)
      label.attr('x', (d) => d.x).attr('y', (d) => d.y)
    })

    return () => simulation.stop()
  }, [data, width, height])

  return <svg ref={svgRef} width={width} height={height} className="w-full h-full" />
}
