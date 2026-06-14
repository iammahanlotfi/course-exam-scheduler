"use client";

import { useMemo, useState } from "react";
import { runScheduler } from "../lib/scheduler";

const sampleInput = {
  courses: [
    { id: "CS101", name: "مبانی برنامه‌نویسی", credits: 3 },
    { id: "CS102", name: "ساختمان داده", credits: 3 },
    { id: "CS103", name: "طراحی الگوریتم", credits: 3 },
    { id: "MA101", name: "ریاضی عمومی", credits: 3 },
    { id: "PH101", name: "فیزیک", credits: 2 },
    { id: "DB101", name: "پایگاه داده", credits: 3 }
  ],
  prerequisites: [
    ["CS101", "CS102"],
    ["CS102", "CS103"],
    ["CS102", "DB101"],
    ["MA101", "CS103"]
  ],
  conflicts: [
    ["CS101", "MA101"],
    ["CS102", "PH101"],
    ["CS103", "PH101"],
    ["DB101", "CS103"],
    ["DB101", "PH101"]
  ],
  maxCoursesPerSemester: 2
};

export default function HomePage() {
  const [jsonText, setJsonText] = useState(
    JSON.stringify(sampleInput, null, 2)
  );
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const courseNameMap = useMemo(() => {
    const map = new Map();

    if (!result?.courses) {
      return map;
    }

    for (const course of result.courses) {
      map.set(course.id, course.name || course.id);
    }

    return map;
  }, [result]);

  function handleRun() {
    setError("");
    setResult(null);

    try {
      const data = JSON.parse(jsonText);
      const output = runScheduler(data);
      setResult(output);
    } catch (err) {
      setError(err.message || "خطای نامشخص رخ داد.");
    }
  }

  function handleLoadSample() {
    setJsonText(JSON.stringify(sampleInput, null, 2));
    setResult(null);
    setError("");
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">پروژه الگوریتم و ساختمان داده</p>
          <h1>سامانه انتخاب واحد و زمان‌بندی امتحانات</h1>
          <p className="hero-text">
            این سامانه با استفاده از DFS، مرتب‌سازی توپولوژیک، گراف تعارض و
            رنگ‌آمیزی گراف، اعتبار چارت درسی و برنامه امتحانات را تحلیل می‌کند.
          </p>
        </div>

        <div className="hero-card">
          <span>الگوریتم‌ها</span>
          <strong>DFS + Topological Sort + Graph Coloring</strong>
        </div>
      </section>

      <section className="grid-layout">
        <div className="panel input-panel">
          <div className="panel-header">
            <div>
              <h2>ورودی پروژه</h2>
              <p>
                دروس، پیش‌نیازها، تعارض‌های امتحانی و ظرفیت هر ترم را در قالب
                JSON وارد کن.
              </p>
            </div>
          </div>

          <textarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            spellCheck="false"
          />

          <div className="actions">
            <button className="primary-button" onClick={handleRun}>
              اجرای الگوریتم
            </button>

            <button className="secondary-button" onClick={handleLoadSample}>
              بارگذاری نمونه
            </button>
          </div>

          {error && <div className="error-box">{error}</div>}
        </div>

        <div className="panel">
          <h2>راهنمای ورودی</h2>

          <div className="help-list">
            <div>
              <strong>courses</strong>
              <span>لیست دروس شامل id، نام و تعداد واحد</span>
            </div>

            <div>
              <strong>prerequisites</strong>
              <span>هر زوج [A, B] یعنی A پیش‌نیاز B است</span>
            </div>

            <div>
              <strong>conflicts</strong>
              <span>
                هر زوج [A, B] یعنی امتحان این دو درس نباید در یک بازه باشد
              </span>
            </div>

            <div>
              <strong>maxCoursesPerSemester</strong>
              <span>حداکثر تعداد درس قابل اخذ در هر ترم</span>
            </div>
          </div>
        </div>
      </section>

      {result && (
        <>
          <section className="status-section">
            <div
              className={
                result.valid ? "status-card success" : "status-card danger"
              }
            >
              <span>وضعیت چارت درسی</span>
              <strong>{result.message}</strong>

              {!result.valid && result.cyclePath.length > 0 && (
                <p>چرخه پیدا شده: {result.cyclePath.join(" ← ")}</p>
              )}
            </div>

            <StatCard
              title="تعداد دروس"
              value={result.courses.length}
              description="گره‌های گراف"
            />

            <StatCard
              title="تعداد پیش‌نیازها"
              value={result.prerequisiteEdges.length}
              description="یال‌های جهت‌دار"
            />

            <StatCard
              title="تعداد تعارض‌ها"
              value={result.conflictEdges.length}
              description="یال‌های بدون‌جهت"
            />
          </section>

          {result.valid && (
            <>
              <section className="results-grid">
                <div className="panel">
                  <h2>ترتیب پیشنهادی اخذ دروس</h2>

                  <div className="timeline">
                    {result.topologicalOrder.map((course, index) => (
                      <div className="timeline-item" key={course}>
                        <span>{index + 1}</span>

                        <div>
                          <strong>{course}</strong>
                          <p>{courseNameMap.get(course)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <h2>دروس پرتعارض</h2>

                  <div className="ranking">
                    {result.highConflictCourses.map((item, index) => (
                      <div className="rank-item" key={item.course}>
                        <span>{index + 1}</span>
                        <strong>{item.course}</strong>
                        <em>{item.degree} تعارض</em>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="panel">
                <h2>برنامه پیشنهادی ترمی</h2>

                <div className="semester-grid">
                  {result.semesters.map((semester, index) => (
                    <div className="semester-card" key={index}>
                      <h3>ترم {index + 1}</h3>

                      <div className="course-tags">
                        {semester.map((course) => (
                          <span key={course}>{course}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel">
                <h2>زمان‌بندی پیشنهادی امتحانات</h2>

                <div className="exam-grid">
                  {result.examSlots.map((slot) => (
                    <div className="exam-card" key={slot.slot}>
                      <h3>بازه امتحانی {slot.slot}</h3>

                      <div className="course-tags">
                        {slot.courses.map((course) => (
                          <span key={course}>{course}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <section className="graph-section">
            <GraphView
              title="گراف جهت‌دار پیش‌نیازها"
              description="فلش از درس پیش‌نیاز به درس وابسته رسم شده است."
              type="directed"
              courses={result.courses}
              edges={result.prerequisiteEdges}
            />

            <GraphView
              title="گراف بدون‌جهت تعارض امتحانی"
              description="هر یال نشان می‌دهد دو درس نباید در یک بازه امتحانی باشند."
              type="undirected"
              courses={result.courses}
              edges={result.conflictEdges}
            />
          </section>
        </>
      )}
    </main>
  );
}

function StatCard({ title, value, description }) {
  return (
    <div className="stat-card">
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{description}</p>
    </div>
  );
}

function GraphView({ title, description, courses, edges, type }) {
  const nodeRadius = 30;
  const svgWidth = 520;
  const svgHeight = 440;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;
  const graphRadius = 165;

  const markerId =
    type === "directed" ? "arrow-marker-directed" : "arrow-marker-none";

  const nodes = courses.map((course, index) => {
    const angle = (2 * Math.PI * index) / courses.length - Math.PI / 2;

    return {
      id: course.id,
      name: course.name || course.id,
      x: centerX + graphRadius * Math.cos(angle),
      y: centerY + graphRadius * Math.sin(angle)
    };
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return (
    <div className="panel graph-panel">
      <h2>{title}</h2>

      {description && <p>{description}</p>}

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="graph-svg"
        role="img"
        aria-label={title}
      >
        <defs>
          <marker
            id="arrow-marker-directed"
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="6"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M2,2 L10,6 L2,10 Z" fill="#38bdf8" />
          </marker>
        </defs>

        {edges.map(([from, to], index) => {
          const source = nodeMap.get(from);
          const target = nodeMap.get(to);

          if (!source || !target) {
            return null;
          }

          const edge = calculateEdgePoints(source, target, nodeRadius);

          return (
            <g key={`${from}-${to}-${index}`}>
              <line
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                className={type === "directed" ? "edge directed" : "edge"}
                markerEnd={
                  type === "directed" ? `url(#${markerId})` : undefined
                }
              />

              {type === "directed" && (
                <text
                  x={(edge.x1 + edge.x2) / 2}
                  y={(edge.y1 + edge.y2) / 2 - 6}
                  textAnchor="middle"
                  className="edge-label"
                >
                  →
                </text>
              )}
            </g>
          );
        })}

        {nodes.map((node) => (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r={nodeRadius} className="node-circle" />

            <text
              x={node.x}
              y={node.y + 5}
              textAnchor="middle"
              className="node-text"
            >
              {node.id}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function calculateEdgePoints(source, target, radius) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    return {
      x1: source.x,
      y1: source.y,
      x2: target.x,
      y2: target.y
    };
  }

  const unitX = dx / distance;
  const unitY = dy / distance;

  return {
    x1: source.x + unitX * radius,
    y1: source.y + unitY * radius,
    x2: target.x - unitX * (radius + 8),
    y2: target.y - unitY * (radius + 8)
  };
}
