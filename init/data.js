const sampleListings = [
  {
    title: "Python Crash Course",
    description:
      "A fast-paced introduction to programming with Python. Learn the basics of coding, projects, and automation.",
    image: { filename: "listingimage", url: "https://ia801705.us.archive.org/view_archive.php?archive=/29/items/l_covers_0008/l_covers_0008_80.zip&file=0008800209-L.jpg" },
    price: 1000, location: "Online", country: "United States",
  },
  {
    title: "Effective Java",
    description:
      "Best practices for Java developers, covering performance, design patterns, and modern coding principles.",
    image: { filename: "listingimage", url: "https://covers.openlibrary.org/b/id/8231856-L.jpghttps://ia801705.us.archive.org/view_archive.php?archive=/29/items/l_covers_0008/l_covers_0008_50.zip&file=0008509606-L.jpg" },
    price: 2500, location: "Online", country: "United States",
  },
  {
    title: "Clean Code",
    description:
      "A handbook of agile software craftsmanship by Robert C. Martin. Write readable and maintainable code.",
    image: { filename: "listingimage", url: "https://ia802302.us.archive.org/view_archive.php?archive=/28/items/olcovers554/olcovers554-L.zip&file=5547794-L.jpg" },
    price: 1800, location: "Chicago", country: "United States",
  },
  {
    title: "The Pragmatic Programmer",
    description:
      "From journeyman to master — timeless tips and principles for every developer’s career.",
    image: { filename: "listingimage", url: "https://ia600404.us.archive.org/view_archive.php?archive=/33/items/l_covers_0010/l_covers_0010_14.zip&file=0010143650-L.jpg" },
    price: 2200, location: "Boston", country: "United States",
  },
  {
    title: "Design Patterns: Elements of Reusable Object-Oriented Software",
    description:
      "The classic ‘Gang of Four’ book explaining proven object-oriented design solutions.",
    image: { filename: "listingimage", url: "https://ia800404.us.archive.org/view_archive.php?archive=/33/items/l_covers_0010/l_covers_0010_82.zip&file=0010827043-L.jpg" },
    price: 3000, location: "London", country: "United Kingdom",
  },
  {
    title: "Head First JavaScript Programming",
    description:
      "A fun and engaging introduction to JavaScript, with visual learning and hands-on projects.",
    image: { filename: "listingimage", url: "https://ia600100.us.archive.org/view_archive.php?archive=/5/items/l_covers_0012/l_covers_0012_77.zip&file=0012772880-L.jpg" },
    price: 1500, location: "New York", country: "United States",
  },
  {
    title: "You Don’t Know JS Yet",
    description:
      "A deep dive into how JavaScript really works — closures, scope, and async patterns demystified.",
    image: { filename: "listingimage", url: "https://covers.openlibrary.org/b/isbn/9781098124045-L.jpg" },
    price: 1200, location: "San Francisco", country: "United States",
  },
  {
    title: "Fluent Python",
    description:
      "Learn to write effective, idiomatic Python using advanced concepts like data models and async programming.",
    image: { filename: "listingimage", url: "https://ia600404.us.archive.org/view_archive.php?archive=/33/items/l_covers_0010/l_covers_0010_29.zip&file=0010290195-L.jpg" },
    price: 2600, location: "Toronto", country: "Canada",
  },
  {
    title: "Introduction to Algorithms",
    description:
      "A comprehensive guide to algorithms and data structures, also known as the CLRS bible.",
    image: { filename: "listingimage", url: "https://ia801909.us.archive.org/view_archive.php?archive=/31/items/l_covers_0013/l_covers_0013_76.zip&file=0013768952-L.jpg" },
    price: 4000, location: "Cambridge", country: "United States",
  },
  {
    title: "JavaScript: The Good Parts",
    description:
      "Douglas Crockford explores the elegant subset of JavaScript — the parts worth using.",
    image: { filename: "listingimage", url: "https://ia800507.us.archive.org/view_archive.php?archive=/8/items/l_covers_0009/l_covers_0009_24.zip&file=0009245523-L.jpg" },
    price: 1400, location: "Los Angeles", country: "United States",
  },
  {
    title: "Learning React",
    description:
      "A hands-on guide to building modern web applications using React and hooks.",
    image: { filename: "listingimage", url: "https://ia600404.us.archive.org/view_archive.php?archive=/33/items/l_covers_0010/l_covers_0010_28.zip&file=0010282783-L.jpg" },
    price: 1800, location: "San Jose", country: "United States",
  },
  {
    title: "C Programming Language (K&R)",
    description:
      "The classic book that defined C, written by its creators Kernighan and Ritchie.",
    image: { filename: "listingimage", url: "https://ia800804.us.archive.org/view_archive.php?archive=/16/items/olcovers668/olcovers668-L.zip&file=6684943-L.jpg" },
    price: 2000, location: "Bell Labs", country: "United States",
  },
  {
    title: "Operating System Concepts",
    description:
      "Comprehensive coverage of operating systems principles, known as the Dinosaur Book.",
    image: { filename: "listingimage", url: "https://ia600404.us.archive.org/view_archive.php?archive=/33/items/l_covers_0010/l_covers_0010_30.zip&file=0010308855-L.jpg" },
    price: 3500, location: "Berlin", country: "Germany",
  },
  {
    title: "Database System Concepts",
    description:
      "A definitive textbook on database systems, covering SQL, design, and transactions.",
    image: { filename: "listingimage", url: "https://ia800404.us.archive.org/view_archive.php?archive=/33/items/l_covers_0010/l_covers_0010_38.zip&file=0010385525-L.jpg" },
    price: 2800, location: "New Delhi", country: "India",
  },
  {
    title: "Artificial Intelligence: A Modern Approach",
    description:
      "The leading textbook for AI, covering theory, algorithms, and applications in depth.",
    image: { filename: "listingimage", url: "https://ia801909.us.archive.org/view_archive.php?archive=/31/items/l_covers_0013/l_covers_0013_53.zip&file=0013530046-L.jpg" },
    price: 4200, location: "Stanford", country: "United States",
  },
  {
    title: "Deep Learning with Python",
    description:
      "François Chollet’s practical guide to deep learning using Keras and TensorFlow.",
    image: { filename: "listingimage", url: "https://covers.openlibrary.org/b/id/10349334-L.jpg" },
    price: 2600, location: "Paris", country: "France",
  },
  {
    title: "Programming Rust",
    description:
      "Dive into systems programming with Rust — safe, fast, and concurrent.",
    image: { filename: "listingimage", url: "https://covers.openlibrary.org/b/id/10412026-L.jpg" },
    price: 2300, location: "Oslo", country: "Norway",
  },
  {
    title: "Go Programming Language",
    description:
      "A thorough introduction to Go, by Alan Donovan and Brian Kernighan.",
    image: { filename: "listingimage", url: "https://covers.openlibrary.org/b/isbn/9780134190440-L.jpg" },
    price: 2100, location: "New York", country: "United States",
  },
  {
    title: "Computer Networking: A Top-Down Approach",
    description:
      "Teaches computer networking starting from applications down to physical layers.",
    image: { filename: "listingimage", url: "https://covers.openlibrary.org/b/id/11305665-L.jpg" },
    price: 3200, location: "Palo Alto", country: "United States",
  },
  {
    title: "Compilers: Principles, Techniques, and Tools",
    description:
      "Known as the Dragon Book — everything about compiler design and language processing.",
    image: { filename: "listingimage", url: "https://ia601605.us.archive.org/view_archive.php?archive=/2/items/olcovers19/olcovers19-L.zip&file=194113-L.jpg" },
    price: 3800, location: "Princeton", country: "United States",
  },
];

module.exports = { data: sampleListings };
