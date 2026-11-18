from unittest import mock


class FakeConn:
    """Records every execute as (sql, params); fetchone answers come from `answers` in order, then (0,)."""

    def __init__(self, answers=()):
        self.calls, self.answers = [], list(answers)

    def execute(self, sql, params=()):
        self.calls.append((" ".join(sql.split()), params))
        return mock.Mock(rowcount=1, fetchone=lambda: self.answers.pop(0) if self.answers else (0,))
