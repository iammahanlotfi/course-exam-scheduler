export function runScheduler(data) {
  const courses = data.courses || [];
  const prerequisites = data.prerequisites || [];
  const conflicts = data.conflicts || [];
  const maxCoursesPerSemester = Number(data.maxCoursesPerSemester || 3);

  if (!Array.isArray(courses) || courses.length === 0) {
    throw new Error("لیست دروس نمی‌تواند خالی باشد.");
  }

  if (!Array.isArray(prerequisites)) {
    throw new Error("فرمت پیش‌نیازها نامعتبر است.");
  }

  if (!Array.isArray(conflicts)) {
    throw new Error("فرمت تعارض‌ها نامعتبر است.");
  }

  if (maxCoursesPerSemester <= 0) {
    throw new Error("حداکثر تعداد درس در هر ترم باید عددی مثبت باشد.");
  }

  const courseMap = buildCourseMap(courses);

  validatePairs(prerequisites, courseMap, "پیش‌نیاز");
  validatePairs(conflicts, courseMap, "تعارض امتحانی");

  const prerequisiteGraph = buildPrerequisiteGraph(courses, prerequisites);
  const conflictGraph = buildConflictGraph(courses, conflicts);

  const cycleInfo = detectCycleDFS(prerequisiteGraph.adj);

  if (cycleInfo.hasCycle) {
    return {
      valid: false,
      message: "چارت درسی نامعتبر است، چون در پیش‌نیازها چرخه وجود دارد.",
      cyclePath: cycleInfo.cyclePath,
      topologicalOrder: [],
      semesters: [],
      examSlots: [],
      highConflictCourses: [],
      prerequisiteEdges: prerequisites,
      conflictEdges: conflicts,
      courses
    };
  }

  const topologicalOrder = topologicalSort(
    prerequisiteGraph.adj,
    prerequisiteGraph.indegree
  );

  if (!topologicalOrder) {
    throw new Error("مرتب‌سازی توپولوژیک ناموفق بود.");
  }

  const semesterPlan = planSemesters(
    topologicalOrder,
    prerequisites,
    maxCoursesPerSemester
  );

  const highConflictCourses = findHighConflictCourses(conflictGraph);

  const coloringOrder = highConflictCourses.map((item) => item.course);
  const coloring = colorGraphGreedy(conflictGraph, coloringOrder);

  const examSlots = groupExamSlots(coloring.colorOf);

  return {
    valid: true,
    message: "چارت درسی معتبر است.",
    cyclePath: [],
    topologicalOrder,
    semesters: semesterPlan.coursesBySemester,
    examSlots,
    highConflictCourses,
    prerequisiteEdges: prerequisites,
    conflictEdges: conflicts,
    courses
  };
}

function buildCourseMap(courses) {
  const map = new Map();

  for (const course of courses) {
    if (!course.id || typeof course.id !== "string") {
      throw new Error("هر درس باید یک id متنی داشته باشد.");
    }

    if (map.has(course.id)) {
      throw new Error(`شناسه درس تکراری است: ${course.id}`);
    }

    map.set(course.id, {
      id: course.id,
      name: course.name || course.id,
      credits: Number(course.credits || 0)
    });
  }

  return map;
}

function validatePairs(pairs, courseMap, label) {
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length !== 2) {
      throw new Error(`${label}: هر رابطه باید دقیقا شامل دو درس باشد.`);
    }

    const [a, b] = pair;

    if (!courseMap.has(a)) {
      throw new Error(`${label}: درس نامعتبر پیدا شد: ${a}`);
    }

    if (!courseMap.has(b)) {
      throw new Error(`${label}: درس نامعتبر پیدا شد: ${b}`);
    }

    if (a === b) {
      throw new Error(`${label}: رابطه خودی برای درس ${a} مجاز نیست.`);
    }
  }
}

function buildPrerequisiteGraph(courses, prerequisites) {
  const adj = new Map();
  const indegree = new Map();

  for (const course of courses) {
    adj.set(course.id, []);
    indegree.set(course.id, 0);
  }

  for (const [pre, course] of prerequisites) {
    adj.get(pre).push(course);
    indegree.set(course, indegree.get(course) + 1);
  }

  return { adj, indegree };
}

function buildConflictGraph(courses, conflicts) {
  const adj = new Map();

  for (const course of courses) {
    adj.set(course.id, new Set());
  }

  for (const [a, b] of conflicts) {
    adj.get(a).add(b);
    adj.get(b).add(a);
  }

  return adj;
}

function detectCycleDFS(adj) {
  const color = new Map();
  const stack = [];
  const cyclePath = [];

  for (const node of adj.keys()) {
    color.set(node, 0);
  }

  function dfs(node) {
    color.set(node, 1);
    stack.push(node);

    for (const next of adj.get(node)) {
      const state = color.get(next);

      if (state === 0) {
        if (dfs(next)) return true;
      } else if (state === 1) {
        const index = stack.lastIndexOf(next);
        cyclePath.push(...stack.slice(index), next);
        return true;
      }
    }

    stack.pop();
    color.set(node, 2);
    return false;
  }

  for (const node of adj.keys()) {
    if (color.get(node) === 0) {
      if (dfs(node)) {
        return { hasCycle: true, cyclePath };
      }
    }
  }

  return { hasCycle: false, cyclePath: [] };
}

function topologicalSort(adj, indegree) {
  const queue = [];
  const order = [];
  const deg = new Map(indegree);

  for (const [node, value] of deg.entries()) {
    if (value === 0) {
      queue.push(node);
    }
  }

  let head = 0;

  while (head < queue.length) {
    const node = queue[head];
    head++;

    order.push(node);

    for (const next of adj.get(node)) {
      deg.set(next, deg.get(next) - 1);

      if (deg.get(next) === 0) {
        queue.push(next);
      }
    }
  }

  if (order.length !== adj.size) {
    return null;
  }

  return order;
}

function planSemesters(topologicalOrder, prerequisites, maxCoursesPerSemester) {
  const prereqMap = new Map();

  for (const course of topologicalOrder) {
    prereqMap.set(course, []);
  }

  for (const [pre, course] of prerequisites) {
    prereqMap.get(course).push(pre);
  }

  const semesterOf = new Map();
  const coursesBySemester = [];

  for (const course of topologicalOrder) {
    let semester = 1;

    for (const pre of prereqMap.get(course)) {
      semester = Math.max(semester, semesterOf.get(pre) + 1);
    }

    while (!coursesBySemester[semester - 1]) {
      coursesBySemester[semester - 1] = [];
    }

    if (coursesBySemester[semester - 1].length >= maxCoursesPerSemester) {
      let nextSemester = semester;

      while (true) {
        if (!coursesBySemester[nextSemester - 1]) {
          coursesBySemester[nextSemester - 1] = [];
        }

        if (coursesBySemester[nextSemester - 1].length < maxCoursesPerSemester) {
          semester = nextSemester;
          break;
        }

        nextSemester++;
      }
    }

    semesterOf.set(course, semester);
    coursesBySemester[semester - 1].push(course);
  }

  return { semesterOf, coursesBySemester };
}

function findHighConflictCourses(conflictGraph) {
  const result = [];

  for (const [course, neighbors] of conflictGraph.entries()) {
    result.push({
      course,
      degree: neighbors.size
    });
  }

  result.sort((a, b) => b.degree - a.degree || a.course.localeCompare(b.course));

  return result;
}

function colorGraphGreedy(conflictGraph, order) {
  const colorOf = new Map();

  for (const node of order) {
    const forbiddenColors = new Set();

    for (const neighbor of conflictGraph.get(node)) {
      if (colorOf.has(neighbor)) {
        forbiddenColors.add(colorOf.get(neighbor));
      }
    }

    let color = 1;

    while (forbiddenColors.has(color)) {
      color++;
    }

    colorOf.set(node, color);
  }

  return { colorOf };
}

function groupExamSlots(colorOf) {
  const groups = new Map();

  for (const [course, slot] of colorOf.entries()) {
    if (!groups.has(slot)) {
      groups.set(slot, []);
    }

    groups.get(slot).push(course);
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([slot, courses]) => ({
      slot,
      courses
    }));
}