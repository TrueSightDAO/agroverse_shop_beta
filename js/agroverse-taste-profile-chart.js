/**
 * Shared D3 taste profile (mobile: horizontal bars, desktop: radial wheel).
 * Load after https://d3js.org/d3.v7.min.js
 *
 * window.AgroverseTasteProfileChart.render(containerElOrSelector, {
 *   batchId: 'AGL4',
 *   profiles: { chocolate: { intensity: 9, notes: ['...'], color: '#...' }, ... },
 *   tooltipClass: 'taste-tooltip--unique-per-page'
 * });
 */
(function (global) {
  'use strict';

  function resolveEl(container) {
    if (!container) return null;
    if (typeof container === 'string') return document.querySelector(container);
    return container;
  }

  function render(container, config) {
    var el = resolveEl(container);
    if (!el || typeof d3 === 'undefined') return;

    var batchId = config.batchId || '';
    var profiles = config.profiles || {};
    var tooltipNs = config.tooltipClass || 'taste-tooltip--agroverse-pdp';

    el.innerHTML = '';
    try {
      d3.selectAll('.' + tooltipNs).remove();
    } catch (ignore) {}

    var data = { batchId: batchId, profiles: profiles };

    var w = el.getBoundingClientRect().width || el.clientWidth || el.offsetWidth || 0;
    var containerWidth = Math.max(w, 280);
    var isMobile = window.innerWidth <= 768;

    if (isMobile) {
      var margin = { top: 20, right: 20, bottom: 40, left: 100 };
      var width = Math.min(Math.max(containerWidth - margin.left - margin.right, 120), 400);
      var height = Object.keys(data.profiles).length * 50 + margin.top + margin.bottom;

      var svg = d3
        .select(el)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height)
        .attr('class', 'taste-bar-chart');

      var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      var xScale = d3.scaleLinear().domain([0, 10]).range([0, width]);
      var yScale = d3
        .scaleBand()
        .domain(Object.keys(data.profiles))
        .range([0, height - margin.top - margin.bottom])
        .padding(0.2);

      var categories = Object.keys(data.profiles);

      g.selectAll('.bar')
        .data(categories)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', 0)
        .attr('y', function (d) {
          return yScale(d);
        })
        .attr('width', function (d) {
          return xScale(data.profiles[d].intensity);
        })
        .attr('height', yScale.bandwidth())
        .attr('fill', function (d) {
          return data.profiles[d].color;
        })
        .attr('opacity', 0.85)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.85);
        });

      g.selectAll('.label')
        .data(categories)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', -5)
        .attr('y', function (d) {
          return yScale(d) + yScale.bandwidth() / 2;
        })
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .style('font-size', '14px')
        .style('fill', '#3b3333')
        .text(function (d) {
          return d.charAt(0).toUpperCase() + d.slice(1);
        });

      g.selectAll('.value')
        .data(categories)
        .enter()
        .append('text')
        .attr('class', 'value')
        .attr('x', function (d) {
          return xScale(data.profiles[d].intensity) + 5;
        })
        .attr('y', function (d) {
          return yScale(d) + yScale.bandwidth() / 2;
        })
        .attr('dy', '0.35em')
        .style('font-size', '12px')
        .style('fill', '#3b3333')
        .style('font-weight', '600')
        .text(function (d) {
          return data.profiles[d].intensity + '/10';
        });

      g.append('g')
        .attr('transform', 'translate(0,' + (height - margin.top - margin.bottom) + ')')
        .call(d3.axisBottom(xScale).ticks(5))
        .style('font-size', '12px');
    } else {
      var padding = 40;
      var maxWidth = 500;
      var width2 = Math.max(240, Math.min(maxWidth, containerWidth - padding * 2));
      var height2 = width2;
      var radius = width2 / 2 - padding;
      var centerX = width2 / 2;
      var centerY = height2 / 2;

      var svg2 = d3
        .select(el)
        .append('svg')
        .attr('width', width2)
        .attr('height', height2)
        .attr('class', 'taste-wheel');

      var tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'taste-tooltip ' + tooltipNs)
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background-color', 'rgba(0,0,0,0.7)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('pointer-events', 'none');

      var categories2 = Object.keys(data.profiles);
      var anglePerCategory = (2 * Math.PI) / categories2.length;

      categories2.forEach(function (category, i) {
        var profile = data.profiles[category];
        var startAngle = i * anglePerCategory - Math.PI / 2;
        var endAngle = (i + 1) * anglePerCategory - Math.PI / 2;
        var intensity = profile.intensity / 10;
        var outerRadius = radius * intensity;

        var arc = d3
          .arc()
          .innerRadius(radius * 0.3)
          .outerRadius(outerRadius)
          .startAngle(startAngle)
          .endAngle(endAngle);

        svg2
          .append('path')
          .attr('d', arc)
          .attr('transform', 'translate(' + centerX + ', ' + centerY + ')')
          .attr('fill', profile.color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .attr('class', 'taste-segment')
          .style('opacity', 0.85)
          .on('mouseover', function (event) {
            d3.select(this).style('opacity', 1);
            tooltip.transition().duration(200).style('opacity', 1);
            tooltip
              .html(
                '<strong>' +
                  category.charAt(0).toUpperCase() +
                  category.slice(1) +
                  '</strong><br>Intensity: ' +
                  profile.intensity +
                  '/10<br>' +
                  profile.notes.join(', ')
              )
              .style('left', event.pageX + 10 + 'px')
              .style('top', event.pageY - 10 + 'px');
          })
          .on('mouseout', function () {
            d3.select(this).style('opacity', 0.85);
            tooltip.transition().duration(200).style('opacity', 0);
          });

        var labelAngle = (startAngle + endAngle) / 2;
        var labelRadius = radius * 0.65;
        var labelX = centerX + Math.cos(labelAngle) * labelRadius;
        var labelY = centerY + Math.sin(labelAngle) * labelRadius;

        svg2
          .append('text')
          .attr('x', labelX)
          .attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('class', 'taste-label')
          .style('font-size', '12px')
          .style('fill', '#3b3333')
          .text(category.charAt(0).toUpperCase() + category.slice(1));

        var intensityRadius = radius * 0.5;
        var intensityX = centerX + Math.cos(labelAngle) * intensityRadius;
        var intensityY = centerY + Math.sin(labelAngle) * intensityRadius;

        svg2
          .append('text')
          .attr('x', intensityX)
          .attr('y', intensityY)
          .attr('text-anchor', 'middle')
          .attr('class', 'taste-intensity')
          .style('font-size', '14px')
          .style('fill', '#3b3333')
          .style('font-weight', '600')
          .text(profile.intensity);
      });

      svg2
        .append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', radius * 0.3)
        .attr('fill', '#3b3333')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      svg2
        .append('text')
        .attr('x', centerX)
        .attr('y', centerY - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '14px')
        .attr('font-weight', '600')
        .text(data.batchId);

      svg2
        .append('text')
        .attr('x', centerX)
        .attr('y', centerY + 15)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '11px')
        .text('Taste Profile');
    }
  }

  global.AgroverseTasteProfileChart = { render: render };
})(typeof window !== 'undefined' ? window : this);
