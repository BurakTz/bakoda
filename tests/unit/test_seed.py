from scripts.seed import aggregate_reviews, build_hotels


def test_aggregate_reviews_empty():
    assert aggregate_reviews([]) == (0.0, 0)


def test_aggregate_reviews_average_and_count():
    reviews = [{"rating": 8.0}, {"rating": 9.0}]
    assert aggregate_reviews(reviews) == (8.5, 2)


def test_build_hotels_review_counts_match_seeded_reviews():
    hotels = build_hotels()
    assert hotels
    for hotel in hotels:
        assert hotel["reviews_count"] == len(hotel["reviews"])
        if hotel["reviews"]:
            expected_avg = round(
                sum(r["rating"] for r in hotel["reviews"]) / len(hotel["reviews"]),
                2,
            )
            assert hotel["rating"] == expected_avg
        else:
            assert hotel["rating"] == 0.0
