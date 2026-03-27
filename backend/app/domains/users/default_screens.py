EQUITY_DEFAULT_SCREENS = [
    {
        "external_id": "default-equity-compounders",
        "name": "Equity Compounders",
        "description": "Equity-oriented funds with stronger 3Y and 5Y CAGR profiles.",
        "filters": {
            "filters": {
                "scheme_class": {"in": ["Equity"]},
                "cagr_3y": {"gte": 12},
                "cagr_5y": {"gte": 12},
            },
            "sort_field": "cagr_3y",
            "sort_order": "desc",
            "enabled_filters": ["scheme_sub_category", "cagr_1y", "cagr_3y", "cagr_5y"],
        },
    },
    {
        "external_id": "default-equity-large-cap-stability",
        "name": "Equity Large Cap Stability",
        "description": "Large-cap leaning equity funds with better stability characteristics.",
        "filters": {
            "filters": {
                "scheme_class": {"in": ["Equity"]},
                "scheme_sub_category": {"in": ["Large Cap Fund", "Large & Mid Cap Fund", "Index Fund"]},
                "cagr_3y": {"gte": 10},
                "volatility_max": {"lte": 16},
            },
            "sort_field": "cagr_3y",
            "sort_order": "desc",
            "enabled_filters": ["scheme_sub_category", "cagr_3y", "volatility_max"],
        },
    },
    {
        "external_id": "default-equity-quality-alpha",
        "name": "Equity Quality Alpha",
        "description": "Equity funds with stronger medium-term return and risk-adjusted profile.",
        "filters": {
            "filters": {
                "scheme_class": {"in": ["Equity"]},
                "cagr_5y": {"gte": 13},
                "sharpe_max": {"gte": 1},
                "sortino_max": {"gte": 1},
            },
            "sort_field": "cagr_5y",
            "sort_order": "desc",
            "enabled_filters": ["scheme_sub_category", "cagr_3y", "cagr_5y", "sharpe_max", "sortino_max"],
        },
    },
]

DEBT_DEFAULT_SCREENS = [
    {
        "external_id": "default-debt-defensive",
        "name": "Debt Defensive",
        "description": "Debt-focused screens designed for lower drawdown and steadier outcomes.",
        "filters": {
            "filters": {
                "scheme_class": {"in": ["Debt"]},
                "cagr_1y": {"gte": 6},
                "mdd_one_year_pct": {"lte": 5},
            },
            "sort_field": "cagr_1y",
            "sort_order": "desc",
            "enabled_filters": ["scheme_sub_category", "cagr_1y", "mdd_one_year_pct"],
        },
    },
    {
        "external_id": "default-debt-income-stable",
        "name": "Debt Income Stable",
        "description": "Debt funds emphasizing steady accrual-oriented performance.",
        "filters": {
            "filters": {
                "scheme_class": {"in": ["Debt"]},
                "scheme_sub_category": {
                    "in": ["Corporate Bond Fund", "Banking and PSU Fund", "Short Duration Fund"]
                },
                "cagr_3y": {"gte": 6},
                "downside_deviation_max": {"lte": 5},
            },
            "sort_field": "cagr_3y",
            "sort_order": "desc",
            "enabled_filters": ["scheme_sub_category", "cagr_1y", "cagr_3y", "downside_deviation_max"],
        },
    },
]

HYBRID_DEFAULT_SCREENS = [
    {
        "external_id": "default-hybrid-balanced-growth",
        "name": "Hybrid Balanced Growth",
        "description": "Hybrid funds with balanced risk and medium-term growth profile.",
        "filters": {
            "filters": {
                "scheme_class": {"in": ["Hybrid"]},
                "cagr_3y": {"gte": 9},
                "volatility_max": {"lte": 14},
            },
            "sort_field": "cagr_3y",
            "sort_order": "desc",
            "enabled_filters": ["scheme_sub_category", "cagr_1y", "cagr_3y", "volatility_max"],
        },
    },
    {
        "external_id": "default-hybrid-low-drawdown",
        "name": "Hybrid Low Drawdown",
        "description": "Hybrid allocation screens with lower drawdown preference.",
        "filters": {
            "filters": {
                "scheme_class": {"in": ["Hybrid"]},
                "mdd_three_year_pct": {"lte": 16},
                "downside_deviation_max": {"lte": 8},
            },
            "sort_field": "mdd_three_year_pct",
            "sort_order": "asc",
            "enabled_filters": ["scheme_sub_category", "mdd_three_year_pct", "downside_deviation_max", "cagr_3y"],
        },
    },
]

GOLD_DEFAULT_SCREENS = [
    {
        "external_id": "default-gold-core",
        "name": "Gold Core Allocation",
        "description": "Gold-focused commodity screen for defensive allocation ideas.",
        "filters": {
            "filters": {
                "scheme_class": {"in": ["Commodity"]},
                "scheme_sub_category": {"in": ["Gold"]},
                "cagr_3y": {"gte": 7},
            },
            "sort_field": "cagr_3y",
            "sort_order": "desc",
            "enabled_filters": ["scheme_sub_category", "cagr_1y", "cagr_3y", "mdd_one_year_pct"],
        },
    },
    {
        "external_id": "default-gold-stability",
        "name": "Gold Stability",
        "description": "Gold screens filtered for relatively steadier risk profile.",
        "filters": {
            "filters": {
                "scheme_class": {"in": ["Commodity"]},
                "scheme_sub_category": {"in": ["Gold"]},
                "volatility_max": {"lte": 22},
            },
            "sort_field": "volatility_max",
            "sort_order": "asc",
            "enabled_filters": ["scheme_sub_category", "volatility_max", "cagr_1y", "mdd_one_year_pct"],
        },
    },
]

DEFAULT_SCREEN_GROUPS = [
    {"key": "equity", "label": "Equity Focused", "filters": EQUITY_DEFAULT_SCREENS},
    {"key": "debt", "label": "Debt Focused", "filters": DEBT_DEFAULT_SCREENS},
    {"key": "gold", "label": "Gold Focused", "filters": GOLD_DEFAULT_SCREENS},
    {"key": "hybrid", "label": "Hybrid Focused", "filters": HYBRID_DEFAULT_SCREENS},
]

DEFAULT_SCREENS = [
    *EQUITY_DEFAULT_SCREENS,
    *DEBT_DEFAULT_SCREENS,
    *GOLD_DEFAULT_SCREENS,
    *HYBRID_DEFAULT_SCREENS,
]

