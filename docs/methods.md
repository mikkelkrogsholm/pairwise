# Methods and Scoring

Participants always do the same thing: they choose between two options.

The selected method only changes how the collected choices are converted into a
score and ranking.

## Pairwise Voting Flow

For each vote:

1. The server chooses two active ideas.
2. The participant chooses one, or skips.
3. The server records the result for that one shown pair.
4. Scores and pair counts are updated.
5. The next pair is selected.

This is easier for participants than ranking a long list. It also lets new ideas
enter the process without restarting the survey.

## Pair Selection: Catchup

Pairwise uses an adaptive pair-selection strategy inspired by All Our Ideas.
For every possible active pair:

```text
weight(pair) = min(1 / (pair_votes + 1), 0.05)
```

The next pair is drawn randomly in proportion to that weight.

Implications:

- pairs with few answers are prioritised,
- new ideas enter rotation quickly,
- heavily answered pairs appear less often,
- the algorithm explores the active option space without precomputing a queue.

The implementation computes weights from SQLite on each request. This is simple
and reliable for hundreds of active ideas. For thousands of active ideas, a
batched or cached pair queue would be more appropriate.

## Score Method: Bayesian Win Rate

Default and recommended.

```text
score = (wins + 1) / (wins + losses + 2) * 100
```

This is the posterior mean of a `Beta(1,1)` win-rate.

Why it is the default:

- a new idea starts at 50,
- low-data ideas do not jump to 0 or 100 after one vote,
- the score is easy to explain as a stabilised chance of beating another option,
- it matches the spirit of the original All Our Ideas scoring.

Use this unless you have a clear reason not to.

## Score Method: Raw Win Rate

```text
score = wins / (wins + losses) * 100
```

Raw win rate is easy to understand, but unstable:

- one win from one vote gives 100,
- one loss from one vote gives 0,
- options with few comparisons can look artificially extreme.

Use it as a reference view, not as the default decision metric.

## Score Method: Bradley-Terry

Bradley-Terry estimates option strength from pairwise outcomes while accounting
for opponent strength.

It can be useful when:

- there are enough votes,
- the comparison graph is reasonably connected,
- some options have faced much stronger or weaker opponents.

Tradeoffs:

- harder to explain to non-technical users,
- less useful with sparse data,
- needs enough connected comparisons to be meaningful.

Pairwise falls back when Bradley-Terry is not appropriate for the survey size or
data shape.

## Choosing a Method

| Situation | Recommended method |
| --- | --- |
| General surveys | Bayesian win rate |
| Public-facing prioritisation | Bayesian win rate |
| Debugging or transparency comparison | Raw win rate |
| Large surveys with many comparisons | Bradley-Terry |
| Very sparse surveys | Bayesian win rate |

## Interpreting Scores

Scores are ranking aids, not precise truth.

Good interpretation:

- compare broad ordering,
- look for clusters,
- keep sample size in mind,
- collect more votes when top options are close.

Bad interpretation:

- treating 63.2 vs 64.1 as a meaningful difference,
- trusting raw win rate with very few votes,
- ignoring whether an option has enough comparisons.

