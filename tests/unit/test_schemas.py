import pytest
from pydantic import ValidationError

from src.schemas import ReviewCreate


def test_review_create_accepts_ten_point_rating():
    review = ReviewCreate(rating=8.5, text="Harika bir konaklama.")
    assert review.rating == 8.5


@pytest.mark.parametrize("rating", [0.5, 0, 10.1, 11])
def test_review_create_rejects_out_of_range_rating(rating: float):
    with pytest.raises(ValidationError):
        ReviewCreate(rating=rating, text="Geçersiz puan denemesi.")
