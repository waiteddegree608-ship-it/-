import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import 'echarts-wordcloud';

const MIN_RADIUS = 120;
const MAX_RADIUS = 300;

const mergeSynonyms = (list: any[]) => {
  for (let i = 0; i < list.length; i++) {
    if (!list[i].name) continue;
    for (let j = i + 1; j < list.length; j++) {
      if (!list[j].name) continue;
      if (String(list[i].name).includes(String(list[j].name)) || String(list[j].name).includes(String(list[i].name))) {
        list[i].value += list[j].value;
        list[j].name = ""; 
      }
    }
  }
};

const getWordCloudOption = (nodeHotspots: any[], radius: number, keywords: any[], nodeKeywordIds: string[]) => {
  let aiProcessed = false;
  let dataList: any[] = [];

  // Try to use AI-refined cloudData if it exists
  if (keywords && nodeKeywordIds) {
    nodeKeywordIds.forEach(kwId => {
      const kw = keywords.find(k => k.id === kwId);
      if (kw && kw.cloudData) {
        aiProcessed = true;
        try {
          const parsed = typeof kw.cloudData === 'string' ? JSON.parse(kw.cloudData) : kw.cloudData;
          const items = Array.isArray(parsed) ? parsed : (parsed.keywords || []);
          items.forEach((item: any) => {
            const existing = dataList.find(d => d.name === item.name);
            if (existing) existing.value += item.value;
            else dataList.push({ name: item.name, value: item.value });
          });
        } catch(e) { console.error("Error parsing cloudData", e); }
      }
    });
  }

  if (!aiProcessed) {
    // Fallback to local heuristic generation if AI data isn't ready yet
    const wordMap: Record<string, number> = {};
    const now = new Date().getTime();
    
    nodeHotspots.forEach(h => {
       if (h.title && h.title.includes("Mock")) return;
       
       let hotspotTime = new Date(h.publishTime).getTime();
       if (isNaN(hotspotTime)) {
         hotspotTime = new Date(h.createdAt || Date.now()).getTime();
       }
       
       const ageInDays = Math.max(0, (now - hotspotTime) / (1000 * 3600 * 24));
       let timeWeight = 1 - (ageInDays / 30);
       if (timeWeight < 0.1 || isNaN(timeWeight)) timeWeight = 0.1; 
       
       const finalScore = (Number(h.heat) || 50) * timeWeight;

       if (h.tags) {
         const tagsArray = h.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
         tagsArray.forEach((t: string) => {
           wordMap[t] = (wordMap[t] || 0) + finalScore * 2; 
         });
       } else if (h.keyword && h.keyword.word) {
         wordMap[h.keyword.word] = (wordMap[h.keyword.word] || 0) + finalScore * 3;
       }

       const textToParse = (h.title || "") + " " + (h.summary || "") + " " + (h.analysis || "");
       if (textToParse) {
         const garbage = ['表示', '报道', '发布', '今天', '可以', '这个', '我们', '什么', '一个', '事件', '论文被', '记者', '通报', '调查', '阅读', '评论'];
         const phrases = textToParse.split(/[\s,。，！；“”"''（）《》【】?？!]/);
         phrases.forEach(p => {
             if (p.length >= 2) {
                 for (let i = 0; i <= p.length - 2; i++) {
                     const w2 = p.substring(i, i+2);
                     if (!garbage.some(g => w2.includes(g))) {
                       wordMap[w2] = (wordMap[w2] || 0) + finalScore * 0.05;
                     }
                     if (i <= p.length - 3) {
                         const w3 = p.substring(i, i+3);
                         if (!garbage.some(g => w3.includes(g))) {
                           wordMap[w3] = (wordMap[w3] || 0) + finalScore * 0.05;
                         }
                     }
                 }
             }
         });
       }
    });

    dataList = Object.entries(wordMap)
      .map(([name, value]) => ({ name, value: isNaN(value) ? 1 : value })); 
      
    dataList.sort((a, b) => b.value - a.value);

    mergeSynonyms(dataList);
  }
    
  dataList.sort((a, b) => b.value - a.value);

  // Synonym merging: AI-like deduplication of overlapping keywords (e.g., "Nature论文" and "Nature")
  mergeSynonyms(dataList);

  // Even if AI provides data, we strictly slice to 20 words
  const data = dataList
    .filter(d => d.name && d.name.length > 1) // Remove empty or single character junk
    .slice(0, 30) // LIMIT TO 30 WORDS for a rounder shape!
    .map(item => ({ name: item.name, value: aiProcessed ? item.value : Math.sqrt(item.value) * 10 })); // AI values are already normalized 10-100

  return {
    tooltip: { show: true },
    series: [{
      type: 'wordCloud',
      shape: 'circle',
      keepAspect: true,
      left: 'center',
      top: 'center',
      width: '80%',
      height: '80%',
      right: null,
      bottom: null,
      sizeRange: [10, Math.max(14, radius * 0.20)], 
      rotationRange: [0, 0], 
      rotationStep: 0,
      gridSize: 8, 
      layoutAnimation: true,
      drawOutOfBound: false, // Set to false to strictly prevent any overlapping
      textStyle: {
        fontFamily: 'sans-serif', // Use system sans-serif to prevent Canvas measureText mismatch which causes overlaps
        fontWeight: 'bold',
        color: function () {
          return 'rgb(' + [
            Math.round(Math.random() * 160 + 50),
            Math.round(Math.random() * 160 + 50),
            Math.round(Math.random() * 160 + 50)
          ].join(',') + ')';
        }
      },
      data: data
    }]
  };
};

const MemoizedWordCloud = React.memo(({ hotspots, radius, keywords, keywordIds }: { hotspots: any[], radius: number, keywords: any[], keywordIds: string[] }) => {
  const option = React.useMemo(() => getWordCloudOption(hotspots, radius, keywords, keywordIds), [hotspots, radius, keywords, keywordIds]);
  return <ReactECharts opts={{ renderer: 'canvas', devicePixelRatio: 3 }} option={option} style={{ width: radius * 2, height: radius * 2 }} />;
}, (prev, next) => {
  // Memoize based on whether the data or size has changed
  return prev.radius === next.radius && prev.hotspots.length === next.hotspots.length && prev.keywordIds.length === next.keywordIds.length && prev.keywords === next.keywords;
});

class ErrorBoundary extends React.Component<{children: any}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return <div style={{padding: '20px', color: 'red'}}>UI Crash: {this.state.error?.message}</div>;
    return this.props.children;
  }
}

export default function Dashboard({ keywords, hotspots }) {

  const [nodes, setNodes] = useState<any[]>([]);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{ id: string, startX: number, startY: number, initialNodeX: number, initialNodeY: number } | null>(null);
  const canvasDragInfo = useRef<{ startX: number, startY: number, initialPanX: number, initialPanY: number } | null>(null);

  // Initialize or update nodes
  useEffect(() => {
    setNodes(prev => {
      let nextNodes = [...prev];
      const existingKwIds = new Set(nextNodes.flatMap(n => n.keywordIds));
      
      keywords.forEach((kw, i) => {
        if (!existingKwIds.has(kw.id)) {
           const centerX = window.innerWidth / 2;
           const centerY = window.innerHeight / 2;
           // Distribute evenly in a much larger circle/spiral to prevent overlapping word clouds
           const angle = (i / keywords.length) * Math.PI * 2;
           // Increase distance significantly based on the number of nodes
           const distance = 500 + (i * 100) + Math.random() * 200; 

           nextNodes.push({
             id: kw.id,
             label: kw.word,
             keywordIds: [kw.id],
             x: centerX + Math.cos(angle) * distance - 100, 
             y: centerY + Math.sin(angle) * distance - 100
           });
        }
      });
      return nextNodes;
    });
  }, [keywords]);

  const getNodeData = (node: any) => {
    const nodeHotspots = hotspots.filter(h => node.keywordIds.includes(h.keywordId));
    const count = nodeHotspots.length;
    // Base radius is MIN_RADIUS, add 3px per article, max MAX_RADIUS
    const radius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, MIN_RADIUS + count * 3));
    return { count, radius, nodeHotspots };
  };

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    dragInfo.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialNodeX: node.x,
      initialNodeY: node.y
    };
  };

  const onPointerMove = (e: React.PointerEvent, id: string) => {
    if (dragInfo.current?.id === id) {
      const dx = (e.clientX - dragInfo.current.startX) / scale;
      const dy = (e.clientY - dragInfo.current.startY) / scale;
      const targetX = dragInfo.current.initialNodeX + dx;
      const targetY = dragInfo.current.initialNodeY + dy;
      
      setNodes(prev => prev.map(n => {
        if (n.id === id) {
          return {
            ...n,
            x: targetX,
            y: targetY
          };
        }
        return n;
      }));
    }
  };

  const onPointerUp = (e: React.PointerEvent, id: string) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch(err) {}
    dragInfo.current = null;
    
    // Check for collisions to merge
    setNodes(prev => {
      const targetNode = prev.find(n => n.id === id);
      if (!targetNode) return prev;

      const targetData = getNodeData(targetNode);

      let mergeCandidate = null;
      let mergeCandidateData = null;
      for (const n of prev) {
        if (n.id === id) continue;
        const nData = getNodeData(n);
        
        const dx = (targetNode.x + targetData.radius) - (n.x + nData.radius);
        const dy = (targetNode.y + targetData.radius) - (n.y + nData.radius);
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        // If centers are close enough (e.g. less than sum of radii * 0.8)
        if (distance < (targetData.radius + nData.radius) * 0.6) {
          mergeCandidate = n;
          mergeCandidateData = nData;
          break;
        }
      }

      if (mergeCandidate && mergeCandidateData) {
        // Calculate new radius to adjust x,y so the circle grows from the center instead of jumping to the bottom right!
        const newCount = targetData.count + mergeCandidateData.count;
        const newRadius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, MIN_RADIUS + newCount * 3));
        const radiusDiff = newRadius - mergeCandidateData.radius;
        
        // Merge targetNode into mergeCandidate
        const mergedNode = {
          id: `${mergeCandidate.id}_${targetNode.id}`,
          label: `${mergeCandidate.label} & ${targetNode.label}`,
          keywordIds: [...mergeCandidate.keywordIds, ...targetNode.keywordIds],
          x: mergeCandidate.x - radiusDiff,
          y: mergeCandidate.y - radiusDiff
        };
        return [...prev.filter(n => n.id !== id && n.id !== mergeCandidate.id), mergedNode];
      }

      return prev;
    });
  };

  const onDoubleClick = (id: string) => {
    setNodes(prev => {
      const targetNode = prev.find(n => n.id === id);
      if (!targetNode) return prev;
      
      // If it's a single keyword, nothing to split
      if (targetNode.keywordIds.length <= 1) return prev;
      
      // We reconstruct the original nodes, spreading them in a small circle around the merged node
      const splitNodes = targetNode.keywordIds.map((kwId, index) => {
        const kw = keywords.find(k => k.id === kwId);
        const count = targetNode.keywordIds.length;
        const angle = (index / count) * Math.PI * 2;
        const spreadDistance = 150; // Distance to push apart
        return {
           id: kwId,
           label: kw ? kw.word : 'Unknown',
           keywordIds: [kwId],
           x: targetNode.x + Math.cos(angle) * spreadDistance,
           y: targetNode.y + Math.sin(angle) * spreadDistance
        };
      });
      
      return [...prev.filter(n => n.id !== id), ...splitNodes];
    });
  };

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target === containerRef.current) {
      e.currentTarget.setPointerCapture(e.pointerId);
      canvasDragInfo.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y
      };
    }
  };

  const onCanvasPointerMove = (e: React.PointerEvent) => {
    if (canvasDragInfo.current) {
      const dx = e.clientX - canvasDragInfo.current.startX;
      const dy = e.clientY - canvasDragInfo.current.startY;
      setPan({
        x: canvasDragInfo.current.initialPanX + dx,
        y: canvasDragInfo.current.initialPanY + dy
      });
    }
  };

  const onCanvasPointerUp = (e: React.PointerEvent) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch(err) {}
    canvasDragInfo.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.deltaY === 0) return;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    let newScale = scale * zoomFactor;
    newScale = Math.max(0.3, Math.min(newScale, 2.5));
    
    // Zoom relative to pointer
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const nodeX = (mouseX - pan.x) / scale;
    const nodeY = (mouseY - pan.y) / scale;

    setPan({
       x: mouseX - nodeX * newScale,
       y: mouseY - nodeY * newScale
    });
    setScale(newScale);
  };

  // Add passive listener for wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      onWheel(e as any);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [scale, pan]);

  return (
    <ErrorBoundary>
    <div 
      ref={containerRef} 
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      style={{ 
        position: 'absolute', 
        inset: 0,
        width: '100vw', 
        height: '100vh', 
        overflow: 'hidden',
        background: 'var(--surface)',
        cursor: canvasDragInfo.current ? 'grabbing' : 'grab'
      }}
    >
      <div style={{ position: 'absolute', top: 80, left: 20, color: 'var(--text-muted)', fontSize: '0.9rem', zIndex: 10, background: 'rgba(15,23,42,0.8)', padding: '10px', borderRadius: '8px', backdropFilter: 'blur(5px)' }}>
        💡 提示：在空白处拖拽画布，滚轮缩放；拖拽圆形使其重叠可融合关键词；<b>双击拆分！</b> 圆形大小代表新闻数量。
      </div>

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        transformOrigin: '0 0',
        pointerEvents: 'none'
      }}>
      
      {nodes.map(node => {
        const { count, radius, nodeHotspots } = getNodeData(node);
        return (
          <div
            key={node.id}
            onPointerDown={(e) => onPointerDown(e, node.id)}
            onPointerMove={(e) => onPointerMove(e, node.id)}
            onPointerUp={(e) => onPointerUp(e, node.id)}
            onDoubleClick={() => onDoubleClick(node.id)}
            style={{
              position: 'absolute',
              left: node.x - radius * 0.40,
              top: node.y - radius * 0.40,
              width: radius * 2.80,
              height: radius * 2.80,
              cursor: 'grab',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              touchAction: 'none',
              pointerEvents: 'auto'
            }}
          >
            <div style={{ position: 'absolute', top: '-25px', color: 'var(--text)', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
              {node.label} <span style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>({count})</span>
            </div>
            
            <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
              {count > 0 ? (
                <MemoizedWordCloud hotspots={nodeHotspots} radius={radius} keywords={keywords} keywordIds={node.keywordIds} />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  暂无数据
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
    </ErrorBoundary>
  );
}
