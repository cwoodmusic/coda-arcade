"""Real answer clicks shared by classroom completion fixtures."""
QUIZ_ANSWERS = {
    'note-naming': (0, 1, 2, 0, 1),
    'rhythm-tree': (1, 0, 2, 1, 0),
    'time-signatures': (2, 1, 0, 2, 1),
}


def answer_quiz(page, lesson, wrong=(), finish=True):
    """Answer a fresh five-question quiz; callers still assert rewards/state."""
    for index, correct in enumerate(QUIZ_ANSWERS[lesson]):
        choice = (correct + 1) % 3 if index in wrong else correct
        page.locator('[data-quiz-answer="' + str(choice) + '"]').click()
        page.locator('[data-quiz-next]').click()
    if finish:
        page.locator('[data-quiz-finish]').click()
