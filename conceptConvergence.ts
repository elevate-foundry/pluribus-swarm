  mergedCount: number;
  totalConcepts: number;
}> {
  const similarities = await findSimilarConcepts(threshold);
  let mergedCount = 0;

  for (const sim of similarities) {
    const success = await mergeConcepts(
      sim.concept1.id,
      sim.concept2.id,
      sim.similarity,
      sim.reason
    );
    if (success) mergedCount++;
  }
