"use client";

import Nav from "../components/Nav";
import Footer from "../components/Footer";
import MateriaisContent from "../components/MateriaisContent";

export default function Materiais() {
  return (
    <div className="pg">
      <Nav />
      <MateriaisContent showHero={true} showCrossLink={true} />
      <Footer />
    </div>
  );
}
