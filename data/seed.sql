-- ============================================================
-- BOILERPLATE SEED DATA — Replace with real UMich course data
-- Each INSERT covers one course. Add/edit rows freely.
-- Columns: code, name, department, credits, description,
--          syllabus_summary, prereqs, advisory_prereqs,
--          difficulty, avg_grade, avg_weekly_hours, class_size,
--          offered_fall, offered_winter, offered_summer,
--          professors, tags
-- ============================================================

-- ── EECS ─────────────────────────────────────────────────────
INSERT OR REPLACE INTO courses VALUES (
  'EECS 183','Elementary Programming Concepts','EECS',4,
  'An introduction to programming with an emphasis on problem solving. Students will develop skills in problem analysis and algorithmic thinking.',
  'Programming fundamentals, problem decomposition, basic data structures, and introduction to Python and C++.',
  '','',
  2.0,'B+',10,600, 1,1,1,
  'Andrew DeOrio,Marcus Darden',
  'gateway,required,intro,python,cpp'
);

INSERT OR REPLACE INTO courses VALUES (
  'EECS 280','Programming and Introductory Data Structures','EECS',4,
  'Techniques and algorithm development and effective programming, top-down analysis, structured programming, testing, and program correctness. Program language syntax and static and runtime semantics. Scope, procedure instantiation, recursion, abstract data types, and parameter passing methods. Structured data types, pointers, linked data structures, stacks, queues, hash tables, binary trees, recursion.',
  'C++ fundamentals, recursion, linked lists, binary trees, hash tables, abstract data types, and software testing.',
  'EECS 183','MATH 115',
  3.0,'B+',14,900, 1,1,1,
  'Andrew DeOrio,James Juett,Sofia Lemons',
  'gateway,required,cpp,data-structures'
);

INSERT OR REPLACE INTO courses VALUES (
  'EECS 281','Data Structures and Algorithms','EECS',4,
  'Introduction to algorithm analysis and O-notation; Fundamental data structures including lists, stacks, queues, priority queues, hash tables, binary trees, search trees, balanced trees and graphs; searching and sorting algorithms; recursive algorithms; basic graph algorithms including graph search, shortest path, and minimum spanning tree algorithms.',
  'Algorithm complexity, sorting, hash tables, trees, graphs, shortest path algorithms, and dynamic programming.',
  'EECS 280','MATH 215',
  4.0,'B',18,700, 1,1,0,
  'Marcus Darden,Saquib Hasan',
  'required,gateway,upper-level,algorithms,data-structures'
);

INSERT OR REPLACE INTO courses VALUES (
  'EECS 370','Introduction to Computer Organization','EECS',4,
  'Basic concepts of computer organization and hardware. Instructions and instruction sequences, machine language, assembly language. Memory organization. Combinational and sequential circuits. Datapaths and control. Memory hierarchy and caches. I/O. Performance evaluation.',
  'Assembly language, memory hierarchy, caches, datapath and control design, and basic computer architecture.',
  'EECS 280','',
  3.0,'B+',14,600, 1,1,0,
  'Peter Chen,Todd Austin',
  'required,systems,hardware,architecture'
);

INSERT OR REPLACE INTO courses VALUES (
  'EECS 376','Foundations of Computer Science','EECS',4,
  'An introduction to theory of computation: what problems can computers solve? What are the limits of computation? Topics include formal models of computation, computability, and computational complexity.',
  'DFAs, NFAs, regular languages, context-free grammars, Turing machines, decidability, P vs NP, and NP-completeness.',
  'EECS 281,MATH 216','',
  4.0,'B',15,400, 1,1,0,
  'Mahesh Viswanathan,Seth Pettie',
  'required,theory,upper-level'
);

INSERT OR REPLACE INTO courses VALUES (
  'EECS 388','Introduction to Computer Security','EECS',4,
  'Introduction to the principles and practice of computer security. Topics include threat modeling, cryptography, authentication, software security (buffer overflows, injection attacks), web security, network security, and privacy.',
  'Cryptography, authentication, web security, buffer overflows, SQL injection, network attacks, and security design.',
  'EECS 281,EECS 370','',
  3.0,'B+',12,350, 1,1,0,
  'J. Alex Halderman,Baris Kasikci',
  'upper-level,security,systems'
);

INSERT OR REPLACE INTO courses VALUES (
  'EECS 445','Introduction to Machine Learning','EECS',4,
  'Introduction to machine learning, including supervised learning (regression, classification), unsupervised learning (clustering, dimensionality reduction), and an introduction to neural networks. Includes mathematical foundations and practical implementations.',
  'Linear/logistic regression, SVMs, neural networks, CNNs, clustering, PCA, and probabilistic graphical models.',
  'EECS 281,MATH 214,STATS 412','MATH 217',
  4.0,'B',18,500, 1,1,0,
  'Honglak Lee,Jacob Abernethy',
  'upper-level,ml,machine-learning,data-science,neural-networks'
);

INSERT OR REPLACE INTO courses VALUES (
  'EECS 482','Introduction to Operating Systems','EECS',4,
  'Fundamental operating system concepts: process and thread management, concurrency, memory management, file systems, and I/O. Programming projects in C++.',
  'Threads, synchronization, virtual memory, file systems, I/O, and distributed systems fundamentals.',
  'EECS 281,EECS 370','',
  5.0,'B-',22,400, 1,1,0,
  'Manos Kapritsos,Baris Kasikci',
  'required,systems,upper-level,cpp'
);

INSERT OR REPLACE INTO courses VALUES (
  'EECS 484','Database Management Systems','EECS',4,
  'Relational database design, SQL, query processing and optimization, transactions and concurrency control, and introduction to NoSQL databases.',
  'ER modeling, relational algebra, SQL, query optimization, transactions, ACID properties, and NoSQL.',
  'EECS 281','',
  3.0,'B+',14,350, 1,1,0,
  'Florin Rusu,H.V. Jagadish',
  'upper-level,databases,data-science,systems'
);

INSERT OR REPLACE INTO courses VALUES (
  'EECS 485','Web Systems','EECS',4,
  'Concepts and skills for building scalable, modern web systems. Topics include web application architecture, HTML/CSS/JavaScript, server-side programming, REST APIs, databases, and cloud deployment.',
  'React, REST APIs, server-side rendering, SQL/NoSQL databases, search indexing, and MapReduce.',
  'EECS 281','',
  3.0,'B+',16,400, 1,1,0,
  'Andrew DeOrio,Nicole Hamilton',
  'upper-level,web,systems,data-science'
);

INSERT OR REPLACE INTO courses VALUES (
  'EECS 492','Introduction to Artificial Intelligence','EECS',4,
  'Introduction to AI techniques: search, constraint satisfaction, planning, logic, probabilistic reasoning, machine learning, and natural language processing.',
  'Search algorithms, Bayesian networks, Markov decision processes, reinforcement learning, and NLP basics.',
  'EECS 281,MATH 217','STATS 412',
  4.0,'B',16,350, 1,1,0,
  'Rada Mihalcea,Joyce Chai',
  'upper-level,ml,ai,machine-learning'
);

INSERT OR REPLACE INTO courses VALUES (
  'EECS 489','Computer Networks','EECS',4,
  'Principles and practice of computer networking. Layered protocol architectures, network applications, transport, routing, link-layer, and network security.',
  'TCP/IP, DNS, HTTP, routing protocols, congestion control, and network security fundamentals.',
  'EECS 482','',
  4.0,'B',16,250, 1,1,0,
  'Z. Morley Mao,Harsha Madhyastha',
  'upper-level,systems,networks'
);

INSERT OR REPLACE INTO courses VALUES (
  'EECS 493','User Interface Development','EECS',4,
  'Principles of user interface design and implementation. Topics include usability evaluation, visual design, interaction techniques, and front-end web development.',
  'UX design principles, usability testing, HTML/CSS/JS, React, accessibility, and visual design.',
  'EECS 281','',
  3.0,'A-',12,300, 1,1,0,
  'Steve Oney,Walter Lasecki',
  'upper-level,web,ui-ux,design'
);

-- ── MATH ─────────────────────────────────────────────────────
INSERT OR REPLACE INTO courses VALUES (
  'MATH 115','Calculus I','MATH',4,
  'Limits and continuity. Differentiation and applications. Introduction to integration. Fundamental theorem of calculus.',
  'Limits, derivatives, chain rule, implicit differentiation, related rates, optimization, and Riemann sums.',
  '','',
  2.0,'B+',10,1800, 1,1,1,
  'Various Instructors',
  'required,gateway,calculus,math-foundation'
);

INSERT OR REPLACE INTO courses VALUES (
  'MATH 116','Calculus II','MATH',4,
  'Techniques of integration. Applications of integration. Sequences and series. Power series and Taylor series.',
  'Integration techniques, applications of integration, sequences, series, Taylor/Maclaurin series.',
  'MATH 115','',
  3.0,'B',12,1600, 1,1,1,
  'Various Instructors',
  'required,calculus,math-foundation'
);

INSERT OR REPLACE INTO courses VALUES (
  'MATH 215','Multivariable Calculus','MATH',4,
  'Calculus of functions of several variables: partial derivatives, multiple integrals, vector calculus.',
  'Partial derivatives, gradients, Lagrange multipliers, double/triple integrals, line integrals, and Stokes theorem.',
  'MATH 116','',
  3.0,'B+',12,1200, 1,1,1,
  'Various Instructors',
  'required,calculus,linear-algebra,math-foundation'
);

INSERT OR REPLACE INTO courses VALUES (
  'MATH 216','Introduction to Differential Equations','MATH',4,
  'First-order ODEs, second-order linear ODEs, systems of ODEs, Laplace transforms. Applications.',
  'Separation of variables, linear ODEs, eigenvalue methods, Laplace transforms, and systems of equations.',
  'MATH 116','',
  3.0,'B+',12,900, 1,1,1,
  'Various Instructors',
  'required,differential-equations,math-foundation'
);

INSERT OR REPLACE INTO courses VALUES (
  'MATH 217','Linear Algebra','MATH',4,
  'Matrices and linear algebra: row reduction, vector spaces, linear transformations, eigenvalues, inner product spaces. Emphasis on conceptual understanding and proofs.',
  'Vector spaces, linear transformations, eigenvalues/eigenvectors, orthogonality, SVD, and proofs.',
  'MATH 215','',
  4.0,'B',14,500, 1,1,0,
  'Various Instructors',
  'required,linear-algebra,proof-based,ml'
);

INSERT OR REPLACE INTO courses VALUES (
  'MATH 425','Introduction to Probability','MATH',3,
  'Probability spaces, random variables, distributions, expectation, conditional probability, limit theorems.',
  'Probability axioms, discrete and continuous distributions, expectation, CLT, and law of large numbers.',
  'MATH 215','',
  4.0,'B',12,400, 1,1,0,
  'Various Instructors',
  'required,probability,stats,ml'
);

INSERT OR REPLACE INTO courses VALUES (
  'MATH 412','Introduction to Modern Algebra','MATH',3,
  'Groups, rings, fields, and homomorphisms. Introduction to abstract algebra with emphasis on proofs.',
  'Group theory, ring theory, isomorphism theorems, polynomial rings, and field extensions.',
  'MATH 217','',
  5.0,'B-',14,200, 1,1,0,
  'Various Instructors',
  'upper-level,proof-based,theory,abstract-algebra'
);

INSERT OR REPLACE INTO courses VALUES (
  'MATH 451','Advanced Calculus I','MATH',3,
  'Rigorous treatment of calculus: real numbers, limits, continuity, differentiation, integration, and series.',
  'Real analysis, epsilon-delta proofs, uniform continuity, Riemann integration, and uniform convergence.',
  'MATH 217','',
  5.0,'B-',14,200, 1,1,0,
  'Various Instructors',
  'upper-level,proof-based,analysis,theory'
);

INSERT OR REPLACE INTO courses VALUES (
  'MATH 471','Numerical Methods I','MATH',3,
  'Numerical analysis: floating point arithmetic, root-finding, interpolation, numerical integration, and linear systems.',
  'Root finding, polynomial interpolation, numerical differentiation/integration, and linear system solvers.',
  'MATH 216,MATH 217','',
  3.0,'B+',12,200, 1,1,0,
  'Various Instructors',
  'upper-level,numerical,ml,data-science'
);

-- ── STATS ────────────────────────────────────────────────────
INSERT OR REPLACE INTO courses VALUES (
  'STATS 250','Introduction to Statistics and Data Analysis','STATS',4,
  'Concepts and methods of statistics: data visualization, probability, sampling distributions, inference, regression.',
  'Descriptive statistics, probability, hypothesis testing, confidence intervals, and simple linear regression.',
  '','',
  2.0,'B+',8,2000, 1,1,1,
  'Various Instructors',
  'gateway,required,stats,data-science'
);

INSERT OR REPLACE INTO courses VALUES (
  'STATS 306','Statistical Computing','STATS',4,
  'Statistical computing in R: data wrangling, visualization, simulation, and reproducible research with R Markdown.',
  'R programming, tidyverse, ggplot2, data wrangling, simulation, and reproducible analysis.',
  'STATS 250','',
  3.0,'A-',12,400, 1,1,0,
  'Various Instructors',
  'stats,data-science,programming,r'
);

INSERT OR REPLACE INTO courses VALUES (
  'STATS 401','Applied Regression Analysis','STATS',3,
  'Multiple regression, model selection, diagnostics, transformations, ANOVA, and logistic regression.',
  'Multiple regression, model diagnostics, variable selection, ANOVA, and logistic regression in R.',
  'STATS 250,MATH 215','',
  3.0,'B+',10,300, 1,1,0,
  'Various Instructors',
  'stats,data-science,regression,applied'
);

INSERT OR REPLACE INTO courses VALUES (
  'STATS 412','Introduction to Probability and Statistics','STATS',3,
  'Probability theory, random variables, distributions, and introduction to statistical inference.',
  'Probability models, common distributions, MLE, hypothesis testing, and Bayesian inference intro.',
  'MATH 215','',
  3.0,'B+',10,600, 1,1,0,
  'Various Instructors',
  'required,stats,probability,ml'
);

INSERT OR REPLACE INTO courses VALUES (
  'STATS 413','Applied Regression Analysis II','STATS',3,
  'Advanced regression techniques: multiple regression, model selection, ridge/lasso regularization, and diagnostics.',
  'Regularization, ridge regression, LASSO, cross-validation, and model selection methods.',
  'STATS 401','',
  3.0,'B+',10,200, 1,1,0,
  'Various Instructors',
  'stats,data-science,ml,regression,upper-level'
);

INSERT OR REPLACE INTO courses VALUES (
  'STATS 415','Data Mining and Statistical Learning','STATS',3,
  'Supervised and unsupervised learning methods: trees, random forests, SVMs, clustering, PCA, and neural networks.',
  'Decision trees, random forests, boosting, SVMs, k-means clustering, PCA, and deep learning intro.',
  'STATS 401,EECS 281','',
  4.0,'B',14,300, 1,1,0,
  'Various Instructors',
  'stats,data-science,ml,machine-learning,upper-level'
);

INSERT OR REPLACE INTO courses VALUES (
  'STATS 426','Introduction to Theoretical Statistics','STATS',3,
  'Mathematical statistics: sampling distributions, estimation, hypothesis testing, Bayesian inference.',
  'Sufficient statistics, MLE, UMP tests, Neyman-Pearson lemma, and Bayesian point estimation.',
  'STATS 412','MATH 425',
  4.0,'B',12,200, 1,1,0,
  'Various Instructors',
  'stats,theory,upper-level,proof-based'
);

-- ── SI (School of Information) ────────────────────────────────
INSERT OR REPLACE INTO courses VALUES (
  'SI 206','Data-Oriented Programming','SI',4,
  'Introduction to data-oriented programming in Python: web scraping, APIs, data cleaning, and SQL.',
  'Python programming, web APIs, data cleaning with pandas, SQL basics, and data visualization.',
  '','',
  2.0,'A-',10,500, 1,1,0,
  'Various Instructors',
  'gateway,data-science,python,programming,sql'
);

INSERT OR REPLACE INTO courses VALUES (
  'SI 330','Data Manipulation','SI',3,
  'Advanced data manipulation and analysis: pandas, NumPy, data wrangling at scale.',
  'Pandas, NumPy, data cleaning, transformation, aggregation, and working with large datasets.',
  'SI 206','',
  3.0,'A-',12,300, 1,1,0,
  'Various Instructors',
  'data-science,python,data-manipulation'
);

INSERT OR REPLACE INTO courses VALUES (
  'SI 618','Data Manipulation and Analysis','SI',3,
  'Advanced data science workflow: data acquisition, cleaning, analysis, visualization, and communication.',
  'Python data stack, exploratory data analysis, statistical modeling, and data storytelling.',
  'SI 330','',
  3.0,'A-',12,200, 1,0,0,
  'Various Instructors',
  'data-science,python,upper-level,graduate-level'
);

-- ── DATASCI ───────────────────────────────────────────────────
INSERT OR REPLACE INTO courses VALUES (
  'DATASCI 101','Introduction to Data Science','DATASCI',4,
  'Foundational concepts in data science: data collection, cleaning, visualization, and basic machine learning.',
  'Python, data visualization, exploratory analysis, basic ML with scikit-learn, and data ethics.',
  '','',
  2.0,'A-',8,400, 1,1,0,
  'Various Instructors',
  'gateway,data-science,python,intro'
);

INSERT OR REPLACE INTO courses VALUES (
  'DATASCI 306','Statistical Computing for Data Science','DATASCI',4,
  'Statistical computing methods for data science: Python/R, simulation, optimization, and Bayesian methods.',
  'Python/R for data science, Monte Carlo simulation, optimization, and probabilistic programming.',
  'STATS 250,EECS 183','',
  3.0,'B+',12,300, 1,1,0,
  'Various Instructors',
  'data-science,stats,programming,python,r'
);

-- ── ROB (Robotics) ────────────────────────────────────────────
INSERT OR REPLACE INTO courses VALUES (
  'ROB 101','Computational Linear Algebra','ROB',4,
  'Applied linear algebra for robotics and engineering: matrix operations, least squares, SVD, and optimization.',
  'Matrix computations, least squares problems, SVD, dimensionality reduction, and Python/Julia implementations.',
  '','',
  3.0,'B+',12,300, 1,1,0,
  'Chad Jenkins,Jessy Grizzle',
  'gateway,linear-algebra,robotics,data-science,ml'
);

INSERT OR REPLACE INTO courses VALUES (
  'ROB 204','Mechanics of Manipulation','ROB',4,
  'Rigid body kinematics and dynamics, forward/inverse kinematics, trajectory planning for robotic manipulation.',
  'Rotation matrices, homogeneous transforms, forward/inverse kinematics, and Jacobians.',
  'ROB 101,MATH 215','',
  3.0,'B+',12,200, 1,1,0,
  'Dmitry Berenson',
  'robotics,kinematics,upper-level'
);

INSERT OR REPLACE INTO courses VALUES (
  'ROB 320','Robot Perception','ROB',4,
  'Sensor models, Bayesian filtering, mapping, and simultaneous localization and mapping (SLAM).',
  'Kalman filters, particle filters, occupancy maps, SLAM, and deep learning for perception.',
  'ROB 204,EECS 281','STATS 412',
  4.0,'B',16,150, 1,1,0,
  'Ryan Eustice,Jason Corso',
  'robotics,perception,ml,upper-level'
);

INSERT OR REPLACE INTO courses VALUES (
  'ROB 501','Mathematics for Robotics','ROB',3,
  'Graduate-level mathematical foundations: optimization, convex analysis, Lie groups, and differential geometry.',
  'Convex optimization, Lie groups, manifolds, and mathematical methods for robotic systems.',
  'MATH 217,EECS 281','MATH 451',
  5.0,'B',16,100, 1,0,0,
  'Jessy Grizzle',
  'robotics,upper-level,proof-based,optimization,graduate-level'
);

-- ── ECON ──────────────────────────────────────────────────────
INSERT OR REPLACE INTO courses VALUES (
  'ECON 101','Principles of Economics I (Microeconomics)','ECON',4,
  'Introduction to microeconomics: supply and demand, consumer theory, producer theory, and market structures.',
  'Supply and demand, elasticity, consumer/producer surplus, monopoly, and game theory basics.',
  '','',
  2.0,'B+',8,1200, 1,1,0,
  'Various Instructors',
  'gateway,economics,social-science'
);

INSERT OR REPLACE INTO courses VALUES (
  'ECON 102','Principles of Economics II (Macroeconomics)','ECON',4,
  'Introduction to macroeconomics: national income, unemployment, inflation, monetary and fiscal policy.',
  'GDP, unemployment, inflation, IS-LM model, monetary policy, and international trade basics.',
  '','',
  2.0,'B+',8,1000, 1,1,0,
  'Various Instructors',
  'gateway,economics,social-science'
);

INSERT OR REPLACE INTO courses VALUES (
  'ECON 401','Intermediate Microeconomics','ECON',3,
  'Consumer and producer theory, general equilibrium, welfare economics, and asymmetric information.',
  'Utility maximization, cost minimization, partial and general equilibrium, externalities.',
  'ECON 101,MATH 115','',
  3.0,'B',10,400, 1,1,0,
  'Various Instructors',
  'economics,quantitative-finance,upper-level'
);

INSERT OR REPLACE INTO courses VALUES (
  'ECON 408','Quantitative Methods for Economics','ECON',3,
  'Applied econometrics: regression analysis, causal inference, time series, and panel data methods.',
  'OLS, IV, difference-in-differences, time series analysis, and panel data econometrics.',
  'ECON 401,STATS 250','',
  4.0,'B',12,200, 1,1,0,
  'Various Instructors',
  'economics,quantitative-finance,stats,regression,upper-level'
);

-- ── MATH Finance / Quant ──────────────────────────────────────
INSERT OR REPLACE INTO courses VALUES (
  'MATH 423','Mathematics of Finance','MATH',3,
  'Mathematical foundations of financial derivatives: arbitrage, options pricing, Black-Scholes model, and risk management.',
  'No-arbitrage pricing, binomial trees, Black-Scholes formula, Greeks, and interest rate models.',
  'MATH 425','ECON 101',
  4.0,'B+',12,200, 1,1,0,
  'Various Instructors',
  'quantitative-finance,probability,upper-level'
);

INSERT OR REPLACE INTO courses VALUES (
  'STATS 489','Topics in Statistics','STATS',3,
  'Advanced statistical modeling topics: time series, Bayesian methods, or statistical learning (varies by term).',
  'Varies: may cover time series (ARIMA, GARCH), Bayesian computation, or advanced ML methods.',
  'STATS 426','',
  4.0,'B',12,100, 1,1,0,
  'Various Instructors',
  'stats,upper-level,time-series,quantitative-finance'
);
