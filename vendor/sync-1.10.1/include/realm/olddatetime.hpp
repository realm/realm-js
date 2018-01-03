/*************************************************************************
 *
 * Copyright 2016 Realm Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 **************************************************************************/

#ifndef REALM_DATETIME_HPP
#define REALM_DATETIME_HPP

#include <ctime>
#include <ostream>

namespace realm {


class OldDateTime {
public:
    OldDateTime() noexcept
        : m_time(0)
    {
    }

    /// Construct from the number of seconds since Jan 1 00:00:00 UTC
    /// 1970.
    /// FIXME: See if we can make this private again. Required by query_expression.hpp
    OldDateTime(int_fast64_t d) noexcept
        : m_time(d)
    {
    }

    /// Return the time as seconds since Jan 1 00:00:00 UTC 1970.
    int_fast64_t get_olddatetime() const noexcept
    {
        return m_time;
    }

    friend bool operator==(const OldDateTime&, const OldDateTime&) noexcept;
    friend bool operator!=(const OldDateTime&, const OldDateTime&) noexcept;
    friend bool operator<(const OldDateTime&, const OldDateTime&) noexcept;
    friend bool operator<=(const OldDateTime&, const OldDateTime&) noexcept;
    friend bool operator>(const OldDateTime&, const OldDateTime&) noexcept;
    friend bool operator>=(const OldDateTime&, const OldDateTime&) noexcept;

    /// Construct from broken down local time.
    ///
    /// \note This constructor uses std::mktime() to convert the
    /// specified local time to seconds since the Epoch, that is, the
    /// result depends on the current globally specified time zone
    /// setting.
    ///
    /// \param year The year (the minimum valid value is 1970).
    ///
    /// \param month The month in the range [1, 12].
    ///
    /// \param day The day of the month in the range [1, 31].
    ///
    /// \param hours Hours since midnight in the range [0, 23].
    ///
    /// \param minutes Minutes after the hour in the range [0, 59].
    ///
    /// \param seconds Seconds after the minute in the range [0,
    /// 60]. Note that the range allows for leap seconds.
    OldDateTime(int year, int month, int day, int hours = 0, int minutes = 0, int seconds = 0);

    template <class Ch, class Tr>
    friend std::basic_ostream<Ch, Tr>& operator<<(std::basic_ostream<Ch, Tr>& out, const OldDateTime&);

    // This is used by query_expression.hpp to generalize its templates and simplify the code *alot*; it is needed
    // because OldDateTime is internally stored in an int64_t column.
    operator int_fast64_t() noexcept;

private:
    int_fast64_t m_time; // Seconds since Jan 1 00:00:00 UTC 1970.
    static std::time_t assemble(int year, int month, int day, int hours, int minutes, int seconds);
    template <typename T>
    friend class Value;
};


// Implementation:

inline bool operator==(const OldDateTime& a, const OldDateTime& b) noexcept
{
    return a.m_time == b.m_time;
}

inline bool operator!=(const OldDateTime& a, const OldDateTime& b) noexcept
{
    return a.m_time != b.m_time;
}

inline bool operator<(const OldDateTime& a, const OldDateTime& b) noexcept
{
    return a.m_time < b.m_time;
}

inline bool operator<=(const OldDateTime& a, const OldDateTime& b) noexcept
{
    return a.m_time <= b.m_time;
}

inline bool operator>(const OldDateTime& a, const OldDateTime& b) noexcept
{
    return a.m_time > b.m_time;
}

inline bool operator>=(const OldDateTime& a, const OldDateTime& b) noexcept
{
    return a.m_time >= b.m_time;
}

inline OldDateTime::operator int_fast64_t() noexcept
{
    return m_time;
}

inline OldDateTime::OldDateTime(int year, int month, int day, int hours, int minutes, int seconds)
    : m_time(assemble(year, month, day, hours, minutes, seconds))
{
}

template <class Ch, class Tr>
inline std::basic_ostream<Ch, Tr>& operator<<(std::basic_ostream<Ch, Tr>& out, const OldDateTime& d)
{
    out << "OldDateTime(" << d.m_time << ")";
    return out;
}

inline std::time_t OldDateTime::assemble(int year, int month, int day, int hours, int minutes, int seconds)
{
    std::tm local_time;
    local_time.tm_year = year - 1900;
    local_time.tm_mon = month - 1;
    local_time.tm_mday = day;
    local_time.tm_hour = hours;
    local_time.tm_min = minutes;
    local_time.tm_sec = seconds;
    local_time.tm_isdst = -1;
    return std::mktime(&local_time);
}


} // namespace realm

#endif // REALM_DATETIME_HPP
